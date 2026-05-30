import Phaser from 'phaser';

export class Poker extends Phaser.GameObjects.Sprite {
  static PW = 90;

  static PH = 120;

  constructor(scene, x, y, texture, frame) {
    super(scene, x, y, texture, frame);
    this.setOrigin(0.5);
    this.id = frame;
  }

  static comparePoker(a, b) {
    if (a instanceof Array) {
      a = a[0];
      b = b[0];
    }
    if (a > 52 || b > 52) {
      return -(a - b);
    }
    a %= 13;
    b %= 13;
    if (a <= 2) a += 13;
    if (b <= 2) b += 13;
    return -(a - b);
  }

  static toCards(pokers) {
    const cards = [];
    for (let i = 0; i < pokers.length; i += 1) {
      let pid = pokers[i];
      if (pid instanceof Array) pid = pid[0];
      if (pid === 53) cards.push('w');
      else if (pid === 54) cards.push('W');
      else cards.push('KA234567890JQ'[pid % 13]);
    }
    return cards;
  }

  static canCompare(pokersA, pokersB) {
    return Rule.cardsValue(this.toCards(pokersA))[0] === Rule.cardsValue(this.toCards(pokersB))[0];
  }

  static toPokers(pokerInHands, cards) {
    const pokers = [];
    for (let i = 0; i < cards.length; i += 1) {
      const candidates = this.toPoker(cards[i]);
      for (let j = 0; j < candidates.length; j += 1) {
        if (pokerInHands.indexOf(candidates[j]) !== -1 && pokers.indexOf(candidates[j]) === -1) {
          pokers.push(candidates[j]);
          break;
        }
      }
    }
    return pokers;
  }

  static toPoker(card) {
    const cards = '?A234567890JQK';
    for (let i = 1; i < cards.length; i += 1) {
      if (card === cards[i]) return [i, i + 13, i + 26, i + 39];
    }
    if (card === 'w') return [53];
    if (card === 'W') return [54];
    return [55];
  }
}

export class Rule {
  static RuleList = {};

  static _CardsType = [
    'rocket', 'bomb',
    'single', 'pair', 'trio', 'trio_pair', 'trio_single',
    'seq_single5', 'seq_single6', 'seq_single7', 'seq_single8', 'seq_single9', 'seq_single10', 'seq_single11', 'seq_single12',
    'seq_pair3', 'seq_pair4', 'seq_pair5', 'seq_pair6', 'seq_pair7', 'seq_pair8', 'seq_pair9', 'seq_pair10',
    'seq_trio2', 'seq_trio3', 'seq_trio4', 'seq_trio5', 'seq_trio6',
    'seq_trio_pair2', 'seq_trio_pair3', 'seq_trio_pair4',
    'seq_trio_single2', 'seq_trio_single3', 'seq_trio_single4', 'seq_trio_single5',
    'bomb_pair', 'bomb_single',
  ];

  static cardsAbove(handCards, turnCards) {
    const turnValue = this.cardsValue(turnCards);
    if (turnValue[0] === '') return '';
    handCards.sort(this.sorter);
    let oneRule = Rule.RuleList[turnValue[0]];
    for (let i = turnValue[1] + 1; i < oneRule.length; i += 1) {
      if (this.containsAll(handCards, oneRule[i])) return oneRule[i];
    }
    if (turnValue[1] < 10000) {
      oneRule = Rule.RuleList.bomb;
      for (let i = 0; i < oneRule.length; i += 1) {
        if (this.containsAll(handCards, oneRule[i])) return oneRule[i];
      }
      if (this.containsAll(handCards, 'wW')) return 'wW';
    }
    return '';
  }

  static bestShot(handCards) {
    handCards.sort(this.sorter);
    let shot = '';
    for (let i = 2; i < this._CardsType.length; i += 1) {
      const oneRule = Rule.RuleList[this._CardsType[i]];
      for (let j = 0; j < oneRule.length; j += 1) {
        if (oneRule[j].length > shot.length && this.containsAll(handCards, oneRule[j])) shot = oneRule[j];
      }
    }
    if (shot === '') {
      const oneRule = Rule.RuleList.bomb;
      for (let i = 0; i < oneRule.length; i += 1) {
        if (this.containsAll(handCards, oneRule[i])) return oneRule[i];
      }
      if (this.containsAll(handCards, 'wW')) return 'wW';
    }
    return shot;
  }

  static sorter(a, b) {
    return '34567890JQKA2wW'.indexOf(a) - '34567890JQKA2wW'.indexOf(b);
  }

  static indexOf(array, ele) {
    if (!array || array[0].length !== ele.length) return -1;
    return array.indexOf(ele);
  }

  static containsAll(parent, child) {
    let index = 0;
    for (let i = 0; i < child.length; i += 1) {
      index = parent.indexOf(child[i], index);
      if (index === -1) return false;
      index += 1;
    }
    return true;
  }

  static cardsValue(cards) {
    if (typeof cards !== 'string') {
      cards.sort(this.sorter);
      cards = cards.join('');
    }
    if (cards === 'wW') return ['rocket', 20000];

    let index = this.indexOf(Rule.RuleList.bomb, cards);
    if (index >= 0) return ['bomb', 10000 + index];

    for (let i = 2; i < this._CardsType.length; i += 1) {
      const typeName = this._CardsType[i];
      index = this.indexOf(Rule.RuleList[typeName], cards);
      if (index >= 0) return [typeName, index];
    }
    return ['', 0];
  }
}

export default Poker;
