import {
  CALL_SCORE_OPTIONS,
  PLAY_OPTIONS,
  getCallScorePrompt,
  getPlayPrompt,
  getPlaySelectionPrompt,
  getShotActionState,
  getVisiblePlayOptions,
  shouldShowCallScoreActions,
  shouldShowPlayActions,
  togglePokerSelection,
} from './flow';

it('defines call score actions for the current backend protocol', () => {
  expect(CALL_SCORE_OPTIONS).toEqual([
    {label: '不抢', rob: 0},
    {label: '抢地主', rob: 1},
  ]);
});

it('shows call score controls only for the local turn', () => {
  expect(getCallScorePrompt(0)).toBe('轮到你抢地主');
  expect(shouldShowCallScoreActions(0)).toBe(true);

  expect(getCallScorePrompt(1)).toBe('等待对手抢地主');
  expect(shouldShowCallScoreActions(1)).toBe(false);
  expect(shouldShowCallScoreActions(-1)).toBe(false);
});

it('defines play actions and hides pass when the player leads the trick', () => {
  expect(PLAY_OPTIONS).toEqual([
    {label: '不出', action: 'pass'},
    {label: '提示', action: 'hint'},
    {label: '清空', action: 'clear'},
    {label: '出牌', action: 'shot'},
  ]);
  expect(getVisiblePlayOptions(true).map(option => option.action)).toEqual(['pass', 'hint', 'shot']);
  expect(getVisiblePlayOptions(true, 2).map(option => option.action)).toEqual(['pass', 'hint', 'clear', 'shot']);
  expect(getVisiblePlayOptions(false).map(option => option.action)).toEqual(['hint', 'shot']);
  expect(getVisiblePlayOptions(false, 2).map(option => option.action)).toEqual(['hint', 'clear', 'shot']);
});

it('shows play prompts and actions only for the local turn', () => {
  expect(getPlayPrompt(0)).toBe('轮到你出牌');
  expect(shouldShowPlayActions(0)).toBe(true);

  expect(getPlayPrompt(2)).toBe('等待对手出牌');
  expect(shouldShowPlayActions(2)).toBe(false);
});

it('describes local play selection feedback', () => {
  expect(getPlaySelectionPrompt(0, 0, '')).toBe('请选择牌出牌');
  expect(getPlaySelectionPrompt(0, 0, '', true)).toBe('可不出，或选择牌跟上');
  expect(getPlaySelectionPrompt(0, 3, '')).toBe('已选 3 张牌，点击出牌');
  expect(getPlaySelectionPrompt(0, 3, '出牌需要大于上家')).toBe('出牌需要大于上家');
  expect(getPlaySelectionPrompt(2, 3, '出牌需要大于上家', true)).toBe('等待对手出牌');
});

it('toggles selected pokers without mutating the previous selection', () => {
  const selected = [3, 5];

  expect(togglePokerSelection(selected, 7)).toEqual([3, 5, 7]);
  expect(togglePokerSelection(selected, 5)).toEqual([3]);
  expect(selected).toEqual([3, 5]);
});

it('reports shot action state from selection and validation state', () => {
  expect(getShotActionState(0, '')).toEqual({
    enabled: false,
    hint: '请选择要出的牌',
  });
  expect(getShotActionState(2, '出牌需要大于上家')).toEqual({
    enabled: false,
    hint: '出牌需要大于上家',
  });
  expect(getShotActionState(1, '')).toEqual({
    enabled: true,
    hint: '',
  });
});
