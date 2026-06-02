const ERROR_REASON_LABELS = {
  'TURN ERROR': '还没轮到你操作',
  'Invalid pokers': '出牌不符合规则',
  'Poker does not exist': '选择的牌不在手牌中',
  'Poker small than last shot': '出牌需要大于上家',
  'Last shot player does not allow pass': '本轮需要你先出牌',
  'Invalid ready value': '准备状态无效',
  'Invalid rob value': '叫地主选择无效',
  'Protocol cannot be resolved': '服务器消息无法解析',
  'Player is not ready': '玩家尚未准备完成',
  'Insufficient point for room level': '积分不足，无法进入该场次',
  'Unsupported server message': '收到暂不支持的服务器消息',
};

const normalizeServerErrorReason = function (reason) {
  const value = String(reason || '').trim();
  if (!value) {
    return '操作失败';
  }

  if (ERROR_REASON_LABELS[value]) {
    return ERROR_REASON_LABELS[value];
  }

  if (value.indexOf('STATE[') !== -1) {
    return '当前阶段不能执行这个操作';
  }

  if (value.indexOf('Room[') === 0 && value.indexOf('Not Found') !== -1) {
    return '房间不存在';
  }

  if (value.indexOf('Room[') === 0 && value.indexOf('Not Joined') !== -1) {
    return '尚未加入房间';
  }

  return value;
};

export {
  ERROR_REASON_LABELS,
  normalizeServerErrorReason,
};
