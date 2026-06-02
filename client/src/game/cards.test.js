import {
  formatCardTypeLabel,
  formatPokerRanks,
  getPokerRank,
  getPokerSortValue,
} from './cards';

it('formats selected poker ids into readable ranks', () => {
  expect(formatPokerRanks([3, 16, 54, 53, 10])).toBe('大王 小王 10 3 3');
  expect(formatPokerRanks([1, 14, 13, 26])).toBe('A A K K');
});

it('ignores invalid poker ids when formatting ranks', () => {
  expect(formatPokerRanks([null, 55, 'bad', 4])).toBe('4');
  expect(formatPokerRanks([])).toBe('');
  expect(formatPokerRanks(null)).toBe('');
});

it('exposes stable rank and sort helpers for the table rail', () => {
  expect(getPokerRank(54)).toBe('W');
  expect(getPokerRank(53)).toBe('w');
  expect(getPokerRank(10)).toBe('0');
  expect(getPokerRank(55)).toBe('');
  expect(getPokerSortValue(54)).toBeGreaterThan(getPokerSortValue(53));
  expect(getPokerSortValue(2)).toBeGreaterThan(getPokerSortValue(1));
});

it('formats backend card type names for selected poker feedback', () => {
  expect(formatCardTypeLabel('rocket', 2)).toBe('王炸');
  expect(formatCardTypeLabel('bomb', 4)).toBe('炸弹');
  expect(formatCardTypeLabel('seq_single5', 5)).toBe('顺子');
  expect(formatCardTypeLabel('seq_pair3', 6)).toBe('连对');
  expect(formatCardTypeLabel('seq_trio2', 6)).toBe('飞机');
  expect(formatCardTypeLabel('seq_trio_single2', 8)).toBe('飞机带单');
  expect(formatCardTypeLabel('seq_trio_pair2', 10)).toBe('飞机带对');
  expect(formatCardTypeLabel('', 2)).toBe('未成牌型');
  expect(formatCardTypeLabel('', 0)).toBe('');
});
