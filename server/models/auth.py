from datetime import datetime

from sqlalchemy import Column, Integer, String, TIMESTAMP, JSON, SMALLINT

from models.base import Base


class User(Base):
    __tablename__ = 'user'
    __table_args__ = {'mysql_collate': 'utf8mb4_general_ci'}
    id = Column(Integer, primary_key=True)
    openid = Column(String(50), unique=True)
    name = Column(String(50))
    sex = Column(SMALLINT)
    avatar = Column(String(256))
    point = Column(Integer, default=1000)
    # GDD v0.2 H.1 段位体系
    segment = Column(String(16), default='gold', nullable=False)
    segment_points = Column(Integer, default=0, nullable=False)
    # GDD v0.2 H.3 排位 ELO
    elo = Column(Integer, default=1000, nullable=False)
    # GDD v0.2 H.2 赛季重置时间戳
    last_season_reset = Column(TIMESTAMP, nullable=True)
    date_joined = Column(TIMESTAMP, default=datetime.now)
    last_modified = Column(TIMESTAMP, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return {
            'uid': self.id,
            'name': self.name,
            'sex': self.sex,
            'avatar': self.avatar,
            'point': self.point if self.point is not None else 1000,
            'segment': self.segment if self.segment else 'gold',
            'segment_points': int(self.segment_points) if self.segment_points is not None else 0,
            'elo': int(self.elo) if self.elo is not None else 1000,
        }


class Record(Base):
    __tablename__ = 'record'
    __table_args__ = {'mysql_collate': 'utf8mb4_general_ci'}
    id = Column(Integer, primary_key=True)
    round = Column(JSON, default=dict)
    robot = Column(SMALLINT, default=1)
    last_modified = Column(TIMESTAMP, default=datetime.now, onupdate=datetime.now)
