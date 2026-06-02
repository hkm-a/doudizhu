jest.mock('phaser', () => ({
  GameObjects: {
    Sprite: class {},
  },
}));

import {getSuggestedPokerOptions, getSuggestedPokers} from './hint';
import {Rule} from './poker';

beforeEach(() => {
  const missingRule = ['?'];
  Rule.RuleList = {
    rocket: missingRule,
    bomb: ['3333'],
    single: ['3', '4', '5', '6'],
    pair: ['33', '44'],
    trio: missingRule,
    trio_pair: missingRule,
    trio_single: missingRule,
    seq_single5: missingRule,
    seq_single6: missingRule,
    seq_single7: missingRule,
    seq_single8: missingRule,
    seq_single9: missingRule,
    seq_single10: missingRule,
    seq_single11: missingRule,
    seq_single12: missingRule,
    seq_pair3: missingRule,
    seq_pair4: missingRule,
    seq_pair5: missingRule,
    seq_pair6: missingRule,
    seq_pair7: missingRule,
    seq_pair8: missingRule,
    seq_pair9: missingRule,
    seq_pair10: missingRule,
    seq_trio2: missingRule,
    seq_trio3: missingRule,
    seq_trio4: missingRule,
    seq_trio5: missingRule,
    seq_trio6: missingRule,
    seq_trio_pair2: missingRule,
    seq_trio_pair3: missingRule,
    seq_trio_pair4: missingRule,
    seq_trio_single2: missingRule,
    seq_trio_single3: missingRule,
    seq_trio_single4: missingRule,
    seq_trio_single5: missingRule,
    bomb_pair: missingRule,
    bomb_single: missingRule,
  };
});

it('suggests a playable lead from the local hand', () => {
  expect(getSuggestedPokers([3, 4, 5], [], true)).toEqual([3]);
});

it('builds and cycles through playable lead hints', () => {
  expect(getSuggestedPokerOptions([3, 4, 5], [], true)).toEqual([[3], [4], [5]]);
  expect(getSuggestedPokers([3, 4, 5], [], true, [3])).toEqual([4]);
  expect(getSuggestedPokers([3, 4, 5], [], true, [4])).toEqual([5]);
  expect(getSuggestedPokers([3, 4, 5], [], true, [5])).toEqual([3]);
});

it('suggests a card above the current table cards', () => {
  expect(getSuggestedPokers([3, 4, 5], [4], false)).toEqual([5]);
});

it('cycles through follow-up hints and includes bomb fallbacks', () => {
  expect(getSuggestedPokerOptions([3, 4, 5], [3], false)).toEqual([[4], [5]]);
  expect(getSuggestedPokers([3, 4, 5], [3], false, [4])).toEqual([5]);

  expect(getSuggestedPokerOptions([3, 16, 29, 42, 4], [4], false)).toEqual([[3, 16, 29, 42]]);
});

it('suggests a higher bomb over a lower bomb', () => {
  Rule.RuleList.bomb = ['3333', '4444'];

  expect(getSuggestedPokers([4, 17, 30, 43], [3, 16, 29, 42], false)).toEqual([4, 17, 30, 43]);
});

it('returns an empty hint when no legal response exists', () => {
  expect(getSuggestedPokers([3], [5], false)).toEqual([]);
  expect(getSuggestedPokers([], [3], false)).toEqual([]);
});
