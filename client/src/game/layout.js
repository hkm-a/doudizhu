const CARD_WIDTH = 90;
const CARD_HEIGHT = 120;

const getPlayerHeadPositions = function (width, height) {
  return [
    {x: width / 2 - 255, y: height - 44, nameSide: 'right'},
    {x: width - CARD_WIDTH / 2 - 26, y: height * 0.47, nameSide: 'left'},
    {x: CARD_WIDTH / 2 + 26, y: height * 0.47, nameSide: 'right'},
  ];
};

const getNameTextLayout = function (head, side) {
  const offset = 46;
  return {
    x: side === 'left' ? head.x - offset : head.x + offset,
    y: head.y - head.height - 20,
    originX: side === 'left' ? 1 : 0,
  };
};

const getControlPosition = function (width, height, yRatio) {
  return {
    x: width / 2,
    y: height * yRatio,
  };
};

const getTableSurfaceLayout = function (width, height) {
  const surfaceWidth = Math.min(width - 150, 760);
  const surfaceHeight = Math.min(height * 0.56, 320);
  const centerY = height * 0.45;

  return {
    x: width / 2,
    y: centerY,
    width: surfaceWidth,
    height: surfaceHeight,
    deckY: centerY - surfaceHeight * 0.22,
    titleY: 14,
  };
};

const getHandPokerY = function (height, isSelected) {
  return height - CARD_HEIGHT / 2 - (isSelected ? 28 : 8);
};

const getHandLayout = function (width, height, cardCount) {
  const count = Math.max(cardCount, 1);
  const gap = Math.min(46, (width - 150) / count);
  const startX = width / 2 - gap * (cardCount - 1) / 2;
  const baseY = getHandPokerY(height, false);

  return {
    gap: gap,
    baseY: baseY,
    positions: Array.from({length: cardCount}, (_, index) => ({
      x: startX + gap * index,
      y: baseY,
    })),
  };
};

const getTablePokerPositions = function (width, height, cardCount) {
  const gap = 54;
  const centerOffset = (cardCount - 1) / 2;
  return Array.from({length: cardCount}, (_, index) => ({
    x: width / 2 + (index - centerOffset) * gap,
    y: height * 0.42,
  }));
};

export {
  CARD_HEIGHT,
  CARD_WIDTH,
  getControlPosition,
  getHandLayout,
  getHandPokerY,
  getNameTextLayout,
  getPlayerHeadPositions,
  getTableSurfaceLayout,
  getTablePokerPositions,
};
