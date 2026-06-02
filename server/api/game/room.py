from __future__ import annotations

import logging
import random
from typing import Optional, List, Dict
from typing import TYPE_CHECKING

from tornado.ioloop import IOLoop

from game.round import GameRound
from models import Record
from .protocol import Protocol as Pt
from .rule import rule
from .timer import Timer

if TYPE_CHECKING:
    from .player import Player

ROBOT_FIRST_JOIN_DELAY = 1
ROBOT_SECOND_JOIN_DELAY = 1


class Room(GameRound):
    robot_no = 0

    def __init__(self, room_id, level=1, allow_robot=True, personality=None):
        from ai.personality import PersonalityMode, resolve_personality
        resolved = personality if isinstance(personality, PersonalityMode) else resolve_personality(personality).mode
        super().__init__(room_id, level, resolved)
        self.timer = Timer(self.on_timeout)
        self.allow_robot = allow_robot

    def restart(self):
        self.timer.stop_timing()
        self.landlord_seat = (self.landlord_seat + 1) % 3
        self.first_session = False
        super().restart()
        for player in self.players:
            if player is None:
                continue
            if player.is_left():
                IOLoop.current().add_callback(self.on_leave, player, True)

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
            'double_turn_uid': self.seat_to_uid(self.double_turn_seat) if self.double_turn_seat >= 0 else -1,
            'personality': self.personality.value if self.personality else 'balanced',
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
            return

        if nth == 1 and self.robot_no > 5:
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

        return super().on_rob(target)

    def start_double_phase(self) -> None:
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
        self._skip_double_to_playing()

    def _skip_double_to_playing(self) -> None:
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
        if not self.landlord:
            return True
        is_end = super().on_double(target, choice)
        self._log_player_double(target, choice)
        if not is_end:
            self.timer.start_timing(self.players[self.double_turn_seat].timeout)
        return is_end

    def _log_player_double(self, target: Player, choice: int) -> None:
        try:
            from api.player_event import get_player_event_logger, new_session_id
            logger = get_player_event_logger()
            if not logger.enabled:
                return
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
                'segment': getattr(player, 'segment', None) or 'gold',
                'segment_points': int(getattr(player, 'segment_points', 0) or 0),
            })
        self.broadcast(response)
        logging.info('Room[%d] GameOver', self.room_id)

        self.timer.stop_timing()
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

    def go_next_turn(self):
        super().go_next_turn()
        if self.turn_player:
            self.timer.start_timing(self.turn_player.timeout)
        else:
            self.timer.stop_timing()

    def has_robot(self) -> bool:
        from .components.simple import RobotPlayer
        return any([isinstance(p, RobotPlayer) for p in self.players])
