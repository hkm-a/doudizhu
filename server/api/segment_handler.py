"""GDD v0.2 H.1 段位 REST API handlers。"""
import json
import logging
from http import HTTPStatus
from datetime import datetime

from sqlalchemy import select, update
from tornado.web import authenticated, HTTPError

from api.base import RestfulHandler
from models import User
from segment import (
    MatchDelta,
    SegmentState,
    apply_match_result,
    apply_season_reset,
    compute_elo_change,
    compute_score_delta,
    from_dict,
)


def _user_to_segment_state(user: User) -> SegmentState:
    return from_dict({'segment': user.segment, 'points': user.segment_points})


class SegmentHandler(RestfulHandler):
    """GET /segment — 当前登录用户的段位状态。"""

    @authenticated
    async def get(self):
        user_info = self.current_user or {}
        uid = user_info.get('uid')
        if not uid:
            raise HTTPError(HTTPStatus.BAD_REQUEST, reason='uid missing in token')
        async with self.session as session:
            user = (await session.execute(
                select(User).where(User.id == uid)
            )).scalar_one_or_none()
            if not user:
                raise HTTPError(HTTPStatus.NOT_FOUND, reason='User not found')
            self.write(_user_to_segment_state(user).to_dict())


class SegmentUpdateHandler(RestfulHandler):
    """POST /segment/update — 内部接口：把一局结算应用到玩家段位。

    Body: {"uid": int, "is_winner": bool, "is_landlord": bool, "base_score": int}
    返回：{state, promoted, demoted, score_delta}

    仅 admin (uid=1) 可调。
    """

    @authenticated
    async def post(self):
        body = json.loads(self.request.body or b'{}')
        uid = int(body.get('uid', 0))
        is_winner = bool(body.get('is_winner', False))
        is_landlord = bool(body.get('is_landlord', False))
        base_score = int(body.get('base_score', 0))

        if uid <= 0:
            raise HTTPError(HTTPStatus.BAD_REQUEST, reason='uid missing or invalid')

        admin_uid = (self.current_user or {}).get('uid')
        if admin_uid != 1:
            raise HTTPError(HTTPStatus.FORBIDDEN, reason='Only admin can update segments')

        async with self.session as session:
            user = (await session.execute(
                select(User).where(User.id == uid)
            )).scalar_one_or_none()
            if not user:
                raise HTTPError(HTTPStatus.NOT_FOUND, reason='User not found')

            current = _user_to_segment_state(user)
            score_delta = compute_score_delta(
                is_winner=is_winner,
                is_landlord=is_landlord,
                base_score=base_score,
                segment_coefficient=current.to_dict()['coefficient'],
            )
            delta = MatchDelta(
                score_delta=score_delta,
                base_score=base_score,
                role='landlord' if is_landlord else 'farmer',
                is_winner=is_winner,
            )
            result = apply_match_result(current, delta)
            await session.execute(
                update(User)
                .where(User.id == uid)
                .values(segment=result.state.segment.value, segment_points=result.state.points)
            )
            await session.commit()
            # GDD v0.2 H.3：段位变更写入 player_event_log
            self._log_segment_change(uid, current, result, is_winner, is_landlord, base_score)
            # GDD v0.2 H.3：如果该玩家当前在房间内，推送 RSP_SEGMENT_CHANGE 给他
            self._push_segment_to_room(uid, current, result)
            self.write(result.to_dict())

    def _push_segment_to_room(self, uid, old, result):
        """GDD v0.2 H.3：段位变更时若该玩家在房间内，推送 RSP_SEGMENT_CHANGE 给他。"""
        try:
            from api.game.globalvar import GlobalVar
            from api.game.protocol import Protocol
            from api.api import _user_to_segment_state
        except ImportError:
            return
        try:
            player = GlobalVar.__players__.get(uid) if hasattr(GlobalVar, '__players__') else None
            if not player or not getattr(player, 'room', None):
                return
            payload = {
                'uid': uid,
                'old_segment': old.segment.value,
                'old_points': old.points,
                'new_segment': result.state.segment.value,
                'new_points': result.state.points,
                'promoted': result.promoted,
                'demoted': result.demoted,
                'score_delta': result.score_delta,
            }
            # 单播给该玩家
            player.write_message([Protocol.RSP_SEGMENT_CHANGE, payload])
        except Exception:
            logging.warning('segment push to room failed for uid=%d', uid, exc_info=True)

    def _log_segment_change(self, uid, old, result, is_winner, is_landlord, base_score):
        """GDD v0.2 H.3：段位变更事件写入 player_event_log（仅变更时）。"""
        try:
            from api.player_event import get_player_event_logger
            logger = get_player_event_logger()
            if not logger.enabled:
                return
            if old.segment == result.state.segment and old.points == result.state.points:
                return  # 无变化
            payload = {
                'old_segment': old.segment.value,
                'old_points': old.points,
                'new_segment': result.state.segment.value,
                'new_points': result.state.points,
                'promoted': result.promoted,
                'demoted': result.demoted,
                'score_delta': result.score_delta,
                'match': {
                    'is_winner': is_winner,
                    'is_landlord': is_landlord,
                    'base_score': base_score,
                },
            }
            logger.log(
                event_type='segment_change',
                player_id=uid,
                room_id=0,
                session_id='segment',
                payload=payload,
                result='success',
            )
        except Exception:
            logging.warning('segment change log failed for uid=%d', uid, exc_info=True)


class SegmentLeaderboardHandler(RestfulHandler):
    """GET /segment/leaderboard?limit=20 — 段位排行榜（按段位 + 积分降序）。"""

    @authenticated
    async def get(self):
        limit = int(self.get_argument('limit', '20'))
        limit = max(1, min(100, limit))
        async with self.session as session:
            users = (await session.execute(
                select(User).order_by(User.segment.desc(), User.segment_points.desc()).limit(limit)
            )).scalars().all()
            self.write({
                'leaderboard': [
                    {
                        'uid': u.id,
                        'name': u.name,
                        'segment': u.segment,
                        'segment_points': int(u.segment_points or 0),
                        'elo': int(u.elo or 1000),
                    }
                    for u in users
                ]
            })


class SeasonResetHandler(RestfulHandler):
    """POST /segment/season/reset — admin 触发：单个玩家段位降 1 级 + 积分清零。

    Body: {"uid": int}
    返回：{old_state, new_state, demoted}
    """

    @authenticated
    async def post(self):
        body = json.loads(self.request.body or b'{}')
        uid = int(body.get('uid', 0))
        if uid <= 0:
            raise HTTPError(HTTPStatus.BAD_REQUEST, reason='uid missing or invalid')

        admin_uid = (self.current_user or {}).get('uid')
        if admin_uid != 1:
            raise HTTPError(HTTPStatus.FORBIDDEN, reason='Only admin can reset seasons')

        async with self.session as session:
            user = (await session.execute(
                select(User).where(User.id == uid)
            )).scalar_one_or_none()
            if not user:
                raise HTTPError(HTTPStatus.NOT_FOUND, reason='User not found')

            old = _user_to_segment_state(user)
            new = apply_season_reset(old)
            demoted = new.segment != old.segment
            now = datetime.utcnow()
            await session.execute(
                update(User)
                .where(User.id == uid)
                .values(segment=new.segment.value, segment_points=new.points, last_season_reset=now)
            )
            await session.commit()

            # 写 player_event_log + 推送（如在房间）
            try:
                from api.player_event import get_player_event_logger
                logger = get_player_event_logger()
                if logger.enabled:
                    logger.log(
                        event_type='season_reset',
                        player_id=uid,
                        room_id=0,
                        session_id='season',
                        payload={
                            'old_segment': old.segment.value,
                            'old_points': old.points,
                            'new_segment': new.segment.value,
                            'new_points': new.points,
                            'demoted': demoted,
                        },
                        result='success',
                    )
            except Exception:
                logging.warning('season reset log failed', exc_info=True)
            try:
                from api.game.globalvar import GlobalVar
                from api.game.protocol import Protocol
                player = GlobalVar.__players__.get(uid) if hasattr(GlobalVar, '__players__') else None
                if player and getattr(player, 'room', None):
                    player.write_message([Protocol.RSP_SEGMENT_CHANGE, {
                        'uid': uid,
                        'old_segment': old.segment.value,
                        'old_points': old.points,
                        'new_segment': new.segment.value,
                        'new_points': new.points,
                        'promoted': False,
                        'demoted': demoted,
                        'score_delta': 0,
                    }])
            except Exception:
                logging.warning('season reset push failed', exc_info=True)

            self.write({
                'old_state': old.to_dict(),
                'new_state': new.to_dict(),
                'demoted': demoted,
            })


class EloUpdateHandler(RestfulHandler):
    """POST /segment/elo/update — admin 触发：调整两个玩家 ELO 评分。

    Body: {"uid_a": int, "uid_b": int, "score_a": float (1.0/0.5/0.0)}
    返回：{result: EloChange.to_dict(), elo_a, elo_b}
    """

    @authenticated
    async def post(self):
        body = json.loads(self.request.body or b'{}')
        uid_a = int(body.get('uid_a', 0))
        uid_b = int(body.get('uid_b', 0))
        score_a = float(body.get('score_a', 0.5))
        if uid_a <= 0 or uid_b <= 0:
            raise HTTPError(HTTPStatus.BAD_REQUEST, reason='uid_a / uid_b missing or invalid')
        if score_a not in (0.0, 0.5, 1.0):
            raise HTTPError(HTTPStatus.BAD_REQUEST, reason='score_a must be 0.0, 0.5, or 1.0')

        admin_uid = (self.current_user or {}).get('uid')
        if admin_uid != 1:
            raise HTTPError(HTTPStatus.FORBIDDEN, reason='Only admin can update ELO')

        async with self.session as session:
            user_a = (await session.execute(
                select(User).where(User.id == uid_a)
            )).scalar_one_or_none()
            user_b = (await session.execute(
                select(User).where(User.id == uid_b)
            )).scalar_one_or_none()
            if not user_a or not user_b:
                raise HTTPError(HTTPStatus.NOT_FOUND, reason='User not found')

            rating_a = int(user_a.elo or 1000)
            rating_b = int(user_b.elo or 1000)
            result = compute_elo_change(rating_a, rating_b, score_a)
            await session.execute(
                update(User).where(User.id == uid_a).values(elo=result.new_rating_a)
            )
            await session.execute(
                update(User).where(User.id == uid_b).values(elo=result.new_rating_b)
            )
            await session.commit()

            # 写 player_event_log
            try:
                from api.player_event import get_player_event_logger
                logger = get_player_event_logger()
                if logger.enabled:
                    logger.log(
                        event_type='elo_update',
                        player_id=uid_a,
                        room_id=0,
                        session_id='elo',
                        payload={
                            'uid_a': uid_a,
                            'uid_b': uid_b,
                            'score_a': score_a,
                            **result.to_dict(),
                        },
                        result='success',
                    )
            except Exception:
                logging.warning('elo update log failed', exc_info=True)

            self.write({
                'result': result.to_dict(),
                'elo_a': result.new_rating_a,
                'elo_b': result.new_rating_b,
            })
