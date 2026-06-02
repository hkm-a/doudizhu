const RANK_CHARS = 'KA234567890JQ';

const RANK_LABELS = {
  '0': '10',
  w: '小王',
  W: '大王',
};

const CARD_TYPE_LABELS = {
  rocket: '王炸',
  bomb: '炸弹',
  single: '单张',
  pair: '对子',
  trio: '三张',
  trio_pair: '三带一对',
  trio_single: '三带一',
  bomb_pair: '四带两对',
  bomb_single: '四带二',
};

const normalizePokerId = function (poker) {
  const id = Number(poker);
  return Number.isInteger(id) && id >= 1 && id <= 54 ? id : null;
};

const getPokerRank = function (poker) {
  const id = normalizePokerId(poker);
  if (id === null) {
    return '';
  }
  if (id === 53) {
    return 'w';
  }
  if (id === 54) {
    return 'W';
  }
  return RANK_CHARS[id % 13];
};

const getPokerSortValue = function (poker) {
  const id = normalizePokerId(poker);
  if (id === null) {
    return -1;
  }
  if (id > 52) {
    return 100 + id;
  }
  const rank = id % 13;
  return rank <= 2 ? rank + 13 : rank;
};

const formatPokerRanks = function (pokers) {
  if (!Array.isArray(pokers) || pokers.length === 0) {
    return '';
  }

  return pokers
    .map(normalizePokerId)
    .filter(id => id !== null)
    .sort((a, b) => getPokerSortValue(b) - getPokerSortValue(a))
    .map(getPokerRank)
    .map(rank => RANK_LABELS[rank] || rank)
    .join(' ');
};

const formatCardTypeLabel = function (cardType, selectedCount = 0) {
  if (!cardType) {
    return selectedCount > 0 ? '未成牌型' : '';
  }
  if (CARD_TYPE_LABELS[cardType]) {
    return CARD_TYPE_LABELS[cardType];
  }
  if (cardType.indexOf('seq_trio_pair') === 0) {
    return '飞机带对';
  }
  if (cardType.indexOf('seq_trio_single') === 0) {
    return '飞机带单';
  }
  if (cardType.indexOf('seq_trio') === 0) {
    return '飞机';
  }
  if (cardType.indexOf('seq_pair') === 0) {
    return '连对';
  }
  if (cardType.indexOf('seq_single') === 0) {
    return '顺子';
  }
  return selectedCount > 0 ? '未知牌型' : '';
};

export {
  formatCardTypeLabel,
  formatPokerRanks,
  getPokerRank,
  getPokerSortValue,
};
