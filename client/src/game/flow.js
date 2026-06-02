const CALL_SCORE_OPTIONS = [
  {label: '不抢', rob: 0},
  {label: '抢地主', rob: 1},
];

const PLAY_OPTIONS = [
  {label: '不出', action: 'pass'},
  {label: '提示', action: 'hint'},
  {label: '清空', action: 'clear'},
  {label: '出牌', action: 'shot'},
];

const getCallScorePrompt = function (turnSeat) {
  return turnSeat === 0 ? '轮到你抢地主' : '等待对手抢地主';
};

const shouldShowCallScoreActions = function (turnSeat) {
  return turnSeat === 0;
};

const getPlayPrompt = function (turnSeat) {
  return turnSeat === 0 ? '轮到你出牌' : '等待对手出牌';
};

const getPlaySelectionPrompt = function (turnSeat, selectedCount, validationError, canPass = false) {
  if (turnSeat !== 0) {
    return getPlayPrompt(turnSeat);
  }

  if (validationError) {
    return validationError;
  }

  if (selectedCount > 0) {
    return '已选 ' + selectedCount + ' 张牌，点击出牌';
  }

  return canPass ? '可不出，或选择牌跟上' : '请选择牌出牌';
};

const shouldShowPlayActions = function (turnSeat) {
  return turnSeat === 0;
};

const getVisiblePlayOptions = function (canPass, selectedCount = 0) {
  return PLAY_OPTIONS.filter(option => {
    if (option.action === 'pass') {
      return canPass;
    }
    if (option.action === 'clear') {
      return selectedCount > 0;
    }
    return true;
  });
};

const togglePokerSelection = function (selectedPokers, pokerId) {
  if (selectedPokers.indexOf(pokerId) === -1) {
    return selectedPokers.concat(pokerId);
  }
  return selectedPokers.filter(selected => selected !== pokerId);
};

const getShotActionState = function (selectedCount, validationError) {
  if (selectedCount === 0) {
    return {
      enabled: false,
      hint: '请选择要出的牌',
    };
  }

  if (validationError) {
    return {
      enabled: false,
      hint: validationError,
    };
  }

  return {
    enabled: true,
    hint: '',
  };
};

export {
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
};
