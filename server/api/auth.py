from http import HTTPStatus
from typing import Optional, Awaitable

from sqlalchemy import select
from tornado.escape import json_encode
from tornado.web import authenticated, HTTPError, RequestHandler

from api.base import RestfulHandler, JwtMixin
from api.game.globalvar import GlobalVar
from models import User

LOGIN_NAME_MAX_LENGTH = 50


def normalize_login_name(value):
    if not isinstance(value, str):
        raise HTTPError(HTTPStatus.BAD_REQUEST, reason='昵称格式异常')

    name = value.strip()
    if not name:
        raise HTTPError(HTTPStatus.BAD_REQUEST, reason='请先输入昵称')
    if len(name) > LOGIN_NAME_MAX_LENGTH:
        raise HTTPError(HTTPStatus.BAD_REQUEST, reason=f'昵称最多 {LOGIN_NAME_MAX_LENGTH} 个字')
    return name


class IndexHandler(RequestHandler):

    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        self.render('poker.html')


class HealthHandler(RestfulHandler):

    async def get(self):
        self.write({
            'status': 'ok',
            'service': 'doudizhu',
            'robots': self.application.allow_robot,
            'lobby': GlobalVar.lobby_summary(),
            'rooms': GlobalVar.room_list(),
        })


class LoginHandler(RestfulHandler, JwtMixin):
    required_fields = ('name',)

    async def get(self):
        self.write({'detail': 'welcome'})

    async def post(self):
        name = normalize_login_name(self.get_json_data()['name'])
        async with self.session as session:
            async with session.begin():
                account = await self.get_one_or_none(select(User).where(User.name == name))
                if not account:
                    account = User(openid=name, name=name, sex=1, avatar='', point=1000)
                    session.add(account)
                    await session.commit()

        account = account.to_dict()
        self.set_secure_cookie('userinfo', json_encode(account))
        self.write({
            **account,
            'room': GlobalVar.find_player_room_id(account['uid']),
            'rooms': GlobalVar.room_list(),
            'token': self.jwt_encode(account)
        })


class UserInfoHandler(RestfulHandler):

    @authenticated
    async def get(self):
        account: User = await self.get_one_or_none(select(User).where(User.id == self.current_user['uid']))
        if account:
            account = account.to_dict()
            self.set_secure_cookie('user', json_encode(account))
            self.write({
                **account,
                'room': GlobalVar.find_player_room_id(account['uid']),
                'rooms': GlobalVar.room_list()
            })
        else:
            self.clear_cookie('userinfo')
            self.send_error(404, reason='User not found')


class LogoutHandler(RestfulHandler):

    @authenticated
    def post(self):
        self.clear_cookie('userinfo')
        self.write({})
