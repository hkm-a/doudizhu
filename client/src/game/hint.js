import Poker, {Rule} from './poker';

const getPokerSignature = function (pokers) {
  return (Array.isArray(pokers) ? pokers : []).slice().sort(Poker.comparePoker).join(',');
};

const appendCandidate = function (candidates, seen, handCards, cards) {
  if (!cards || cards.length === 0 || !Rule.containsAll(handCards, cards)) {
    return;
  }
  if (seen[cards]) {
    return;
  }
  seen[cards] = true;
  candidates.push(cards);
};

const getLeadCandidateCards = function (handCards) {
  const candidates = [];
  const seen = {};
  appendCandidate(candidates, seen, handCards, Rule.bestShot(handCards.slice()));

  const cardTypes = Array.isArray(Rule._CardsType) ? Rule._CardsType.slice(2) : [];
  cardTypes.forEach(typeName => {
    const rules = Array.isArray(Rule.RuleList[typeName]) ? Rule.RuleList[typeName] : [];
    rules.forEach(cards => appendCandidate(candidates, seen, handCards, cards));
  });

  const bombs = Array.isArray(Rule.RuleList.bomb) ? Rule.RuleList.bomb : [];
  bombs.forEach(cards => appendCandidate(candidates, seen, handCards, cards));
  appendCandidate(candidates, seen, handCards, 'wW');
  return candidates;
};

const getFollowCandidateCards = function (handCards, tableCards) {
  const turnValue = Rule.cardsValue(tableCards);
  if (!turnValue[0]) {
    return [];
  }

  const candidates = [];
  const seen = {};
  const sameTypeRules = Array.isArray(Rule.RuleList[turnValue[0]]) ? Rule.RuleList[turnValue[0]] : [];
  const sameTypeIndex = turnValue[0] === 'bomb' ? turnValue[1] - 10000 : turnValue[1];
  for (let index = sameTypeIndex + 1; index < sameTypeRules.length; index += 1) {
    appendCandidate(candidates, seen, handCards, sameTypeRules[index]);
  }

  if (turnValue[1] < 10000) {
    const bombs = Array.isArray(Rule.RuleList.bomb) ? Rule.RuleList.bomb : [];
    bombs.forEach(cards => appendCandidate(candidates, seen, handCards, cards));
    appendCandidate(candidates, seen, handCards, 'wW');
  }

  return candidates;
};

const getSuggestedPokerOptions = function (handPokers, tablePokers, canLead) {
  if (!handPokers || handPokers.length === 0) {
    return [];
  }

  const handCards = Poker.toCards(handPokers).sort(Rule.sorter);
  const candidateCards = canLead || !tablePokers || tablePokers.length === 0
    ? getLeadCandidateCards(handCards)
    : getFollowCandidateCards(handCards, Poker.toCards(tablePokers));

  const seen = {};
  return candidateCards
    .map(cards => Poker.toPokers(handPokers, cards))
    .filter(pokers => pokers.length > 0)
    .filter(pokers => {
      const signature = getPokerSignature(pokers);
      if (seen[signature]) {
        return false;
      }
      seen[signature] = true;
      return true;
    });
};

const getSuggestedPokers = function (handPokers, tablePokers, canLead, currentSelection = []) {
  const options = getSuggestedPokerOptions(handPokers, tablePokers, canLead);
  if (options.length === 0) {
    return [];
  }

  const currentSignature = getPokerSignature(currentSelection);
  const currentIndex = options.findIndex(option => getPokerSignature(option) === currentSignature);
  if (currentIndex === -1) {
    return options[0];
  }

  return options[(currentIndex + 1) % options.length];
};

export {
  getSuggestedPokerOptions,
  getSuggestedPokers,
};
