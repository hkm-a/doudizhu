import {ERROR_REASON_LABELS, normalizeServerErrorReason} from './error';

it('translates known backend error reasons into player-facing labels', () => {
  expect(ERROR_REASON_LABELS['TURN ERROR']).toBe('还没轮到你操作');
  expect(normalizeServerErrorReason('Invalid pokers')).toBe('出牌不符合规则');
  expect(normalizeServerErrorReason('Poker small than last shot')).toBe('出牌需要大于上家');
  expect(normalizeServerErrorReason('Last shot player does not allow pass')).toBe('本轮需要你先出牌');
  expect(normalizeServerErrorReason('Insufficient point for room level')).toBe('积分不足，无法进入该场次');
  expect(normalizeServerErrorReason('Unsupported server message')).toBe('收到暂不支持的服务器消息');
});

it('summarizes dynamic backend state and room errors', () => {
  expect(normalizeServerErrorReason('STATE[State.PLAYING]')).toBe('当前阶段不能执行这个操作');
  expect(normalizeServerErrorReason('ERROR STATE[State.WAITING]')).toBe('当前阶段不能执行这个操作');
  expect(normalizeServerErrorReason('Room[99] Not Found')).toBe('房间不存在');
  expect(normalizeServerErrorReason('Room[8] Not Joined')).toBe('尚未加入房间');
});

it('keeps unknown server error details readable', () => {
  expect(normalizeServerErrorReason('  unexpected failure  ')).toBe('unexpected failure');
  expect(normalizeServerErrorReason('')).toBe('操作失败');
  expect(normalizeServerErrorReason(null)).toBe('操作失败');
});
