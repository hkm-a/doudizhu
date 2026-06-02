import {
  GAME_OVER_RESTART_DELAY,
  getGameOverMultipleSummary,
  getGameOverResult,
  getGameOverScoreRows,
  getGameOverStatusSummary,
} from './result';

it('describes landlord game-over results', () => {
  expect(getGameOverResult(true)).toEqual({
    title: '地主赢',
    detail: '地主守住牌桌',
    sound: 'music_win',
  });
});

it('describes farmer game-over results', () => {
  expect(getGameOverResult(false)).toEqual({
    title: '农民赢',
    detail: '农民合力获胜',
    sound: 'music_lose',
  });
});

it('keeps the automatic restart delay readable', () => {
  expect(GAME_OVER_RESTART_DELAY).toBe(9000);
});

it('maps game-over point rows onto local seat names', () => {
  expect(getGameOverScoreRows(
    [
      {uid: 7, point: 20, balance: 1020},
      {uid: 8, point: -10, balance: 990},
    ],
    [
      {uid: 8, name: 'farmer'},
      {uid: 7, name: 'landlord'},
    ]
  )).toEqual([
    {uid: 7, name: 'landlord', point: 20, balance: 1020},
    {uid: 8, name: 'farmer', point: -10, balance: 990},
  ]);
});

it('formats a compact game-over status summary for the React rail', () => {
  expect(getGameOverStatusSummary(true, [
    {name: 'landlord', point: 20},
    {name: 'farmer', point: -10},
    {name: 'teammate', point: 0},
  ])).toBe('地主赢 · landlord +20 / farmer -10 / teammate 0');
});

it('falls back to the winner title when no game-over scores are available', () => {
  expect(getGameOverStatusSummary(false, [])).toBe('农民赢');
});

it('formats game-over multiple details for settlement review', () => {
  expect(getGameOverMultipleSummary({
    origin: 10,
    origin_multiple: 15,
    di: 4,
    rob: 2,
    bomb: 4,
    spring: 3,
    farmer: 1,
  })).toBe('总倍数 x1440 · 底分 10 / 初始 x15 / 底牌 x4 / 炸弹 x4 / 抢地主 x2 / 春天 x3');
});

it('omits empty multiple details from settlement review', () => {
  expect(getGameOverMultipleSummary(null)).toBe('');
  expect(getGameOverMultipleSummary({origin: 0, di: 1, bomb: 1})).toBe('');
});
