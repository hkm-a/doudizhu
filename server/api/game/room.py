from __future__ import annotations

import logging
import random
from functools import reduce
from operator import mul
from typing import Optional, List, Dict
from typing import TYPE_CHECKING

from tornado.ioloop import IOLoop

from models import Record
from .protocol import Protocol as Pt
from .rule import rule
from .timer import Timer

if TYPE_CHECKING:
    from .player import Player

ROBOT_FIRST_JOIN_DELAY = 1
ROBOT_SECOND_JOIN_DELAY = 1


class Room(object):
    robot_no = 0
    level_profiles = {
        1: {'label': '新手场', 'origin': 10, 'min_point': 0},
        2: {'label': '进阶场', 'origin': 30, 'min_point': 1000},
        3: {'label': '高手场', 'origin': 60, 'min_point': 2000},
    }

    def __init__(self, room_id, level=1, allow_robot=True, personality=None):
        from ai.personality import PersonalityMode, resolve_personality
        self.room_id = room_id
        self.level = level
        level_profile = self.level_profile(level)
        # GDD v0.2 F 章节：AI 性格注入层。房主创建房间时设定。
        self.personality: PersonalityMode = personality if isinstance(personality, PersonalityMode) else resolve_personality(personality).mode
        self._multiple_details: Dict[str, int] = {
            'origin': level_profile['origin'],
            'origin_multiple': 15,
            'di': 1,
            'ming': 1,
            'bomb': 1,
            'rob': 1,
            'spring': 1,
            'landlord': 1,
            'farmer': 1,
        }

        self.players: List[Optional[Player]] = [None, None, None]
        self.pokers: List[int] = []

        self.timer = Timer(self.on_timeout)
        self.whose_turn = 0
        self.landlord_seat = 0
        self.bomb_multiple = 2

        # GDD v0.2 G 章节：加倍阶段状态
        self.double_turn_seat: int = -1
        self._double_decisions: Dict[int, int] = {}

        # GDD v0.2 onboarding 实施层：首局标记
        self.first_session: bool = True

        self.last_shot_seat = 0
        self.last_shot_poker: List[int] = []
        self.shot_round: List[List[int]] = []

        self.allow_robot = allow_robot

    @classmethod
    def level_profile(cls, level):
        return cls.level_profiles.get(level, {
            'label': '%s 档' % level,
            'origin': cls.level_profiles[1]['origin'],
            'min_point': 0,
        })

    def restart(self):
        for key, val in self._multiple_details.items():
            if key.startswith('origin'):
                continue
            self._multiple_details[key] = 1

        self.pokers: List[int] = []

        self.timer.stop_timing()
        self.whose_turn = 0
        self.landlord_seat = (self.landlord_seat + 1) % 3
        self.bomb_multiple = 2

        self.last_shot_seat = 0
        self.last_shot_poker = []
        self.shot_round = []
        self._rob_record = []

        # GDD v0.2 G 章节：重置加倍阶段状态
        self.double_turn_seat = -1
        self._double_decisions = {}

        # GDD v0.2 onboarding 实施层：第一局标记
        self.first_session = False

        for player in self.players:
            if player is None:
                continue
            if player.is_left():
                IOLoop.current().add_callback(self.on_leave, player, True)
            else:
                player.restart()

    @property
    def room_state(self):
        from .player import State
        for player in self.players:
            if player and not player.is_left():
                return player.state
        return State.INIT

    def sync_data(self):
        return {
            'id': self.room_id,
            'level': self.level,
            'label': self.level_profile(self.level)['label'],
            'origin': self._multiple_details['origin'],
            'min_point': self.level_profile(self.level)['min_point'],
            'multiple': self.multiple,
            'state': self.room_state,
            'landlord_uid': self.seat_to_uid(self.landlord_seat),
            'whose_turn': self.seat_to_uid(self.whose_turn),
            'timer': self.timer.timeout,
            'pokers': list(self.pokers),
            'last_shot_uid': self.seat_to_uid(self.last_shot_seat),
            'last_shot_poker': self.last_shot_poker,
            # GDD v0.2 G 章节：加倍阶段状态
            'double_turn_uid': self.seat_to_uid(self.double_turn_seat) if self.double_turn_seat >= 0 else -1,
            # GDD v0.2 F 章节：AI 性格
            'personality': self.personality.value if self.personality else 'balanced',
            # GDD v0.2 onboarding 实施层：首局标记 + 引导提示
            'first_session': self.first_session,
            'onboarding_hints': {
                'call_score_available': True,
                'shot_highlight_hint': True,
                'pass_button_hint': True,
            },
        }

    def broadcast(self, response):
        for player in self.players:
            if player and not player.is_left():
                player.write_message(response)

    def sync_room(self):
        for player in self.players:
            if player and not player.is_left():
                response = [Pt.RSP_JOIN_ROOM, {
                    'room': self.sync_data(),
                    'players': [p.sync_data(p == player) if p else {} for p in self.players]
                }]
                player.write_message(response)

    def add_robot(self, nth=1):
        size = self.size()
        if size == 0 or size == 3:
            return

        if size == 2 and nth == 1:
            # only allow [human robot robot]
            return

        if nth == 1 and self.robot_no > 5:
            # limit robot number
            return

        from .components.simple import RobotPlayer
        p1 = RobotPlayer(10000 + self.robot_no + nth, f'IDIOT-{nth}', random.randint(0, 1), '', self)
        p1.to_server(Pt.REQ_JOIN_ROOM, {'room': self.room_id, 'level': 1})

        if nth == 1:
            IOLoop.current().call_later(ROBOT_SECOND_JOIN_DELAY, self.add_robot, nth=2)
            self.robot_no += 1

    def on_timeout(self):
        player = self.turn_player
        if player is None:
            logging.warning('Room[%d] timeout without turn player', self.room_id)
            self.timer.stop_timing()
            return
        player.on_timeout()

    def on_join(self, target: Player):
        if self._on_join(target):
            if self.allow_robot and self.level == 1:
                IOLoop.current().call_later(ROBOT_FIRST_JOIN_DELAY, self.add_robot, nth=1)
            return True
        return False

    def on_rob(self, target: Player) -> bool:
        if not self.is_full():
            logging.warning('Room[%d] rob skipped because room is not full', self.room_id)
            self.timer.stop_timing()
            return False

        if target.rob == 1:
            self._multiple_details['rob'] *= 2

        if not self._is_rob_end():
            self.go_next_turn()
            return False

        for i in range(3):
            # 每个人都抢地主, 第一个人是地主
            if self.turn_player.rob == 1 or i == 2:
                self.turn_player.landlord = 1
                self.turn_player.push_pokers(self.pokers)
                self.last_shot_seat = self.whose_turn
                self.re_multiple()
                return True
            self.go_prev_turn()
        return True

    def start_double_phase(self) -> None:
        """抢地主结束 → 开启加倍阶段。

        顺序：依 seat 顺序从第一个非地主玩家开始。2 个农民先，地主最后。
        """
        if not self.landlord:
            self._skip_double_to_playing()
            return
        for i in range(3):
            player = self.players[i]
            if player and not player.is_left() and not player.landlord:
                self.double_turn_seat = i
                self._double_decisions = {}
                self.timer.start_timing(player.timeout)
                return
        # 极端情况（无人非地主）：跳过加倍
        self._skip_double_to_playing()

    def _skip_double_to_playing(self) -> None:
        """无加倍阶段（房间不满等）→ 直接进 PLAYING。"""
        from .player import State
        self.double_turn_seat = -1
        self._double_decisions = {}
        self.whose_turn = self.landlord_seat
        for player in self.players:
            if player and not player.is_left():
                player.change_state(State.PLAYING)
        if self.turn_player:
            self.timer.start_timing(self.turn_player.timeout)

    def on_double(self, target: Player, choice: int) -> bool:
        """记录 target 的加倍选择；返回是否所有玩家都已决策。"""
        if not self.landlord:
            return True
        self._double_decisions[target.uid] = choice
        if choice == 1:
            if target.landlord == 1:
                self._multiple_details['landlord'] *= 2
            else:
                self._multiple_details['farmer'] *= 2
        # GDD v0.2 行为日志：玩家加倍决策写入 player_event_log
        self._log_player_double(target, choice)
        next_seat = self._next_double_seat(target.seat)
        if next_seat is None:
            return True  # 全部 3 人都已决策
        self.double_turn_seat = next_seat
        self.timer.start_timing(self.players[next_seat].timeout)
        return False

    def _next_double_seat(self, current_seat: int) -> Optional[int]:
        for i in range(1, 4):
            candidate = (current_seat + i) % 3
            player = self.players[candidate]
            if player and not player.is_left() and player.uid not in self._double_decisions:
                return candidate
        return None

    def _log_player_double(self, target: Player, choice: int) -> None:
        """GDD v0.2 行为日志：玩家加倍决策写入 JSONL。"""
        try:
            from api.player_event import get_player_event_logger, new_session_id
            logger = get_player_event_logger()
            if not logger.enabled:
                return
            # 会话 id：跨加倍 / 出牌全程唯一；优先复用 room 上的 _session_id
            session_id = getattr(self, '_session_id', None) or new_session_id()
            self._session_id = session_id
            payload = {
                'choice': int(choice),
                'is_landlord': bool(target.landlord == 1),
                'multiple_after': dict(self._multiple_details),
            }
            logger.log(
                event_type='double_decision',
                player_id=target.uid,
                room_id=self.room_id,
                session_id=session_id,
                payload=payload,
                result='success' if choice in (0, 1) else 'fail',
            )
        except Exception:
            logging.warning('Room[%d] player double log failed', self.room_id, exc_info=True)

    async def _auto_apply_segment(self, winner: Player) -> None:
        """GDD v0.2 H.5：on_game_over 自动给 3 个玩家应用段位变更 + 推 RSP_SEGMENT_CHANGE。

        异步执行，避开 on_game_over 同步路径。失败不重试（避免雪崩）。
        """
        try:
            from sqlalchemy import select as _select, update as _update
            from config import DATABASE_URI
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
            from sqlalchemy.orm import sessionmaker as _sm
            from models import User
            from segment import (
                MatchDelta, SegmentState, apply_match_result, compute_score_delta,
                from_dict, SEGMENT_COEFFICIENTS,
            )
            from api.game.protocol import Protocol as _Pt
        except Exception:
            logging.warning('segment auto-apply imports failed', exc_info=True)
            return

        base_score = self._multiple_details['origin']
        if base_score <= 0:
            return

        engine = create_async_engine(DATABASE_URI, echo=False, pool_pre_ping=True)
        Session = _sm(engine, class_=AsyncSession, expire_on_commit=False)
        updates = []
        try:
            async with Session() as session:
                for player in self.players:
                    if not player or player.is_left():
                        continue
                    user = (await session.execute(
                        _select(User).where(User.id == player.uid)
                    )).scalar_one_or_none()
                    if not user:
                        continue
                    old = from_dict({'segment': user.segment, 'points': user.segment_points})
                    is_winner = (player == winner)
                    is_landlord = (player.landlord == 1)
                    coefficient = float(SEGMENT_COEFFICIENTS[old.segment])
                    score_delta = compute_score_delta(is_winner, is_landlord, base_score, coefficient)
                    delta = MatchDelta(
                        score_delta=score_delta,
                        base_score=base_score,
                        role='landlord' if is_landlord else 'farmer',
                        is_winner=is_winner,
                    )
                    result = apply_match_result(old, delta)
                    await session.execute(
                        _update(User).where(User.id == user.id).values(
                            segment=result.state.segment.value,
                            segment_points=result.state.points,
                        )
                    )
                    updates.append((player, old, result, is_winner, is_landlord))
                await session.commit()
        finally:
            await engine.dispose()

        # 推送 RSP_SEGMENT_CHANGE 给每个玩家
        for player, old, result, is_winner, is_landlord in updates:
            try:
                player.write_message([_Pt.RSP_SEGMENT_CHANGE, {
                    'uid': player.uid,
                    'old_segment': old.segment.value,
                    'old_points': old.points,
                    'new_segment': result.state.segment.value,
                    'new_points': result.state.points,
                    'promoted': result.promoted,
                    'demoted': result.demoted,
                    'score_delta': result.score_delta,
                }])
            except Exception:
                logging.warning('segment push to player=%d failed', player.uid, exc_info=True)

            # 写 player_event_log
            try:
                from api.player_event import get_player_event_logger
                logger = get_player_event_logger()
                if logger.enabled:
                    logger.log(
                        event_type='segment_change',
                        player_id=player.uid,
                        room_id=self.room_id,
                        session_id=f'room-{self.room_id}',
                        payload={
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
                            'auto': True,
                        },
                        result='success',
                    )
            except Exception:
                logging.warning('segment change log failed', exc_info=True)

    def on_deal_poker(self):
        if not self.is_full():
            logging.warning('Room[%d] deal skipped because room is not full', self.room_id)
            self.timer.stop_timing()
            return False

        try:
            from .dealer import generate_pokers
            self.pokers = generate_pokers(self.allow_robot)
        except ModuleNotFoundError:
            self.pokers = list(range(1, 55))
            random.shuffle(self.pokers)
            logging.info('RANDOM POKERS')

        for i in range(3):
            self.players[i].push_pokers(self.pokers[i * 17: (i + 1) * 17])

        self.pokers = self.pokers[51:]

        self.whose_turn = self.landlord_seat
        self.timer.start_timing(self.turn_player.timeout)
        for player in self.players:
            response = [Pt.RSP_DEAL_POKER, {
                'uid': self.turn_player.uid,
                'timer': self.timer.timeout,
                'pokers': player.hand_pokers
            }]
            if not player.is_left():
                player.write_message(response)
            logging.info('ROOM[%s] DEAL[%s]', self.room_id, response)
        return True

    def on_shot(self, seat: int, pokers: List[int]) -> str:
        if pokers:
            spec = rule.get_poker_spec(pokers)
            if spec is None:
                return 'Poker does not comply with the rules'

            if seat != self.last_shot_seat and rule.compare_pokers(pokers, self.last_shot_poker) <= 0:
                return 'Poker small than last shot'

            if spec == 'bomb' or spec == 'rocket':
                self._multiple_details['bomb'] *= 2

            self.last_shot_seat = seat
            self.last_shot_poker = pokers
        else:
            if seat == self.last_shot_seat:
                return 'Last shot player does not allow pass'

        self.shot_round.append(pokers)
        return ''

    def on_leave(self, target: Player, is_restart=False):
        from .components.simple import RobotPlayer
        from .globalvar import GlobalVar
        try:
            free_robot = 0
            for i, player in enumerate(self.players):
                if player == target:
                    self.players[i] = None
                elif is_restart and isinstance(player, RobotPlayer):
                    self.players[i] = None
                    free_robot = 1

            self.robot_no -= free_robot
            GlobalVar.on_room_changed(self)
            return True
        except ValueError:
            logging.error('Player[%d] NOT IN Room[%d]', target.uid, self.room_id)
            return False

    def on_game_over(self, winner: Player):
        spring = self.is_spring(winner)
        anti_spring = self.anti_spring(winner)
        if spring or anti_spring:
            self._multiple_details['spring'] *= 3

        response = [Pt.RSP_GAME_OVER, {
            'winner': winner.uid,
            'spring': int(self.is_spring(winner)),
            'antispring': int(self.anti_spring(winner)),
            'multiple': self._multiple_details,
            'players': [],
        }]
        for player in self.players:
            if not player:
                continue
            point = self.get_point(winner, player)
            player.point += point
            response[1]['players'].append({
                'uid': player.uid,
                'point': point,
                'balance': player.point,
                'pokers': player.hand_pokers,
                # GDD v0.2 H.5：RSP_GAME_OVER 带 segment 字段让前端 HUD 拿到
                'segment': getattr(player, 'segment', None) or 'gold',
                'segment_points': int(getattr(player, 'segment_points', 0) or 0),
            })
        self.broadcast(response)
        logging.info('Room[%d] GameOver', self.room_id)

        self.timer.stop_timing()
        # GDD v0.2 H.5：on_game_over 自动给 3 个玩家应用段位变更
        IOLoop.current().add_callback(self._auto_apply_segment, winner)
        IOLoop.current().add_callback(self.restart)

    async def save_shot_round(self):
        landlord = self.landlord
        if landlord is None:
            logging.warning('Room[%d] skipped saving shot round because landlord is missing', self.room_id)
            return False

        for active_player in self.players:
            if not active_player or not active_player.socket:
                continue

            record = Record(round={
                'left': {
                    room_player.seat: list(room_player.hand_pokers)
                    for room_player in self.players
                    if room_player
                },
                'round': [list(shot) for shot in self.shot_round],
                'lord': landlord.seat,
            }, robot=self.has_robot())
            try:
                await active_player.socket.insert(record)
            except Exception:
                logging.exception('Room[%d] failed to save shot round', self.room_id)
                return False
            return True
        return False

    async def save_player_points(self):
        balances = {
            player.uid: player.point
            for player in self.players
            if player
        }
        if not balances:
            return False

        for active_player in self.players:
            if not active_player or not active_player.socket:
                continue
            save_player_points = getattr(active_player.socket, 'save_player_points', None)
            if not save_player_points:
                continue
            try:
                await save_player_points(balances)
            except Exception:
                logging.exception('Room[%d] failed to save player points', self.room_id)
                return False
            return True
        return False

    @property
    def multiple(self) -> int:
        return reduce(mul, self._multiple_details.values(), 1) // self._multiple_details['origin']

    def re_multiple(self):
        joker_number = rule.get_joker_no(self.pokers)
        if joker_number > 0:
            self._multiple_details['di'] *= 2 * joker_number
            return

        if rule.is_same_color(self.pokers):
            self._multiple_details['di'] *= 2

        if rule.is_short_seq(self.pokers):
            self._multiple_details['di'] *= 2

    def get_point(self, winner: Player, player: Player) -> int:
        point = reduce(mul, self._multiple_details.values(), 1)
        if self.landlord == winner:
            if winner == player:
                return point * 2
            else:
                return -point
        else:
            if player.landlord == 0:
                return point
            else:
                return -point * 2

    def is_spring(self, winner: Player) -> bool:
        if self.landlord == winner:
            for i, poker in enumerate(self.shot_round):
                if i % 3 == 0:
                    continue
                if poker:
                    return False
            return True
        return False

    def anti_spring(self, winner: Player) -> bool:
        if self.landlord == winner:
            return False

        for i, poker in enumerate(self.shot_round):
            if i == 0:
                continue
            if i % 3 == 0 and poker:
                return False
        return True

    def _on_join(self, target: Player):
        for i, player in enumerate(self.players):
            if player:
                continue
            target.seat = i
            self.players[i] = target
            return True
        return False

    def go_next_turn(self):
        for _ in range(3):
            self.whose_turn += 1
            if self.whose_turn == 3:
                self.whose_turn = 0
            if self.turn_player:
                break
        else:
            self.timer.stop_timing()
            return
        self.timer.start_timing(self.turn_player.timeout)

    def go_prev_turn(self):
        self.whose_turn -= 1
        if self.whose_turn == -1:
            self.whose_turn = 2

    def seat_to_uid(self, seat):
        if self.players[seat]:
            return self.players[seat].uid
        return -1

    @property
    def landlord(self):
        for player in self.players:
            if player and player.landlord == 1:
                return player
        return None

    @property
    def prev_player(self):
        prev_seat = (self.whose_turn - 1) % 3
        return self.players[prev_seat]

    @property
    def turn_player(self):
        return self.players[self.whose_turn]

    @property
    def next_player(self):
        next_seat = (self.whose_turn + 1) % 3
        return self.players[next_seat]

    def _is_rob_end(self) -> bool:
        """
        每人都可以抢一次地主, 第一个人可以多抢一次
        :return: 抢地主是否结束
        """
        # 下一个人没有抢地主, 继续抢地主
        if self.next_player.rob == -1:
            return False

        # 抢了一圈, 处理第一个人多抢一次
        if self.next_player.seat == self.landlord_seat:
            # 第一个人第一次没有抢, 结束
            if self.next_player.rob == 0:
                return True

            if self.turn_player.rob == 0:
                # 当前用户没有抢
                if self.prev_player.rob == 0:
                    # 前一个用户也没有抢, 第一个人是地主, 结束
                    return True
                else:
                    # 前一个用户抢了, 第一个人可以多抢一次, 继续抢
                    return False
            else:
                # 当前用户抢了, 第一个人可以多抢一次, 继续抢
                return False

        # 第一个人也抢了, 结束
        return True

    def is_ready(self) -> bool:
        return self.is_full() and all([p.ready for p in self.players])

    def is_full(self) -> bool:
        return self.size() == 3

    def is_empty(self) -> bool:
        return self.size() == 0

    def has_robot(self) -> bool:
        from .components.simple import RobotPlayer
        return any([isinstance(p, RobotPlayer) for p in self.players])

    def size(self):
        return sum([p is not None for p in self.players])

    def __str__(self):
        return f'[{self.room_id}{[p or "-" for p in self.players]}]'

    def __hash__(self):
        return self.room_id

    def __eq__(self, other):
        return self.room_id == other.room_id

    def __ne__(self, other):
        return not (self == other)
