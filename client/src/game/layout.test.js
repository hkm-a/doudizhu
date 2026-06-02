import {
  CARD_HEIGHT,
  CARD_WIDTH,
  getControlPosition,
  getHandLayout,
  getHandPokerY,
  getNameTextLayout,
  getPlayerHeadPositions,
  getTableSurfaceLayout,
  getTablePokerPositions,
} from './layout';

it('positions player heads around the table', () => {
  expect(CARD_WIDTH).toBe(90);
  expect(CARD_HEIGHT).toBe(120);
  const positions = getPlayerHeadPositions(960, 540);
  expect(positions[0]).toEqual({x: 225, y: 496, nameSide: 'right'});
  expect(positions[1]).toMatchObject({x: 889, nameSide: 'left'});
  expect(positions[1].y).toBeCloseTo(253.8);
  expect(positions[2]).toMatchObject({x: 71, nameSide: 'right'});
  expect(positions[2].y).toBeCloseTo(253.8);
});

it('derives name text layout from head geometry', () => {
  expect(getNameTextLayout({x: 889, y: 253.8, height: 90}, 'left')).toEqual({
    x: 843,
    y: 143.8,
    originX: 1,
  });
  expect(getNameTextLayout({x: 225, y: 496, height: 90}, 'right')).toEqual({
    x: 271,
    y: 386,
    originX: 0,
  });
});

it('positions controls and local hand cards responsively', () => {
  expect(getControlPosition(960, 540, 0.62)).toEqual({x: 480, y: 334.8});
  expect(getHandPokerY(540, false)).toBe(472);
  expect(getHandPokerY(540, true)).toBe(452);

  const layout = getHandLayout(960, 540, 3);
  expect(layout.gap).toBe(46);
  expect(layout.baseY).toBe(472);
  expect(layout.positions).toEqual([
    {x: 434, y: 472},
    {x: 480, y: 472},
    {x: 526, y: 472},
  ]);
});

it('centers table pokers for any count', () => {
  const threeCards = getTablePokerPositions(960, 540, 3);
  expect(threeCards.map(position => position.x)).toEqual([426, 480, 534]);
  threeCards.forEach(position => {
    expect(position.y).toBeCloseTo(226.8);
  });

  const oneCard = getTablePokerPositions(960, 540, 1);
  expect(oneCard[0].x).toBe(480);
  expect(oneCard[0].y).toBeCloseTo(226.8);
});

it('sizes the visual table surface inside the game canvas', () => {
  const layout = getTableSurfaceLayout(960, 540);
  expect(layout.x).toBe(480);
  expect(layout.y).toBeCloseTo(243);
  expect(layout.width).toBe(760);
  expect(layout.height).toBeCloseTo(302.4);
  expect(layout.deckY).toBeCloseTo(176.472);
  expect(layout.titleY).toBe(14);

  const narrow = getTableSurfaceLayout(700, 420);
  expect(narrow.width).toBe(550);
  expect(narrow.height).toBeCloseTo(235.2);
  expect(narrow.deckY).toBeCloseTo(137.256);
});
