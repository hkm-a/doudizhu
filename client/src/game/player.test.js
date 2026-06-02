jest.mock('phaser', () => ({
  GameObjects: {
    Sprite: class {},
  },
  Easing: {
    Default: 'Default',
  },
}));

import Player from './player';

const createTextStub = () => ({
  color: '',
  text: '',
  visible: true,
  setText(value) {
    this.text = value;
    return this;
  },
  setVisible(value) {
    this.visible = value;
    return this;
  },
  setColor(value) {
    this.color = value;
    return this;
  },
});

it('binds profile UI to player identity and ready state', () => {
  const player = new Player(0);
  const head = {
    cleared: false,
    frame: '',
    tint: null,
    clearTint() { this.cleared = true; this.tint = null; },
    setFrame(frame) { this.frame = frame; },
    setTint(tint) { this.tint = tint; this.cleared = false; },
  };
  const nameText = createTextStub();
  const readyText = createTextStub();
  const cardCountText = createTextStub();
  const sayText = createTextStub();

  player.attachProfileUI({head, nameText, readyText, cardCountText, sayText});
  player.updateInfo(42, 'tester');
  player.setPoint(1040);
  player.setReady(true);
  player.setCardCount(17);
  player.setTurnActive(true);
  player.setLandlord();

  expect(player.uid).toBe(42);
  expect(player.point).toBe(1040);
  expect(nameText.text).toBe('tester');
  expect(readyText.text).toBe('已准备');
  expect(readyText.visible).toBe(true);
  expect(cardCountText.text).toBe('17张');
  expect(cardCountText.visible).toBe(true);
  expect(player.turnActive).toBe(true);
  expect(head.tint).toBe(0xffd56d);
  expect(nameText.color).toBe('#ffd56d');
  expect(head.frame).toBe('icon_landlord.png');

  player.setLeft(true);
  expect(player.left).toBe(true);
  expect(readyText.text).toBe('暂离');
  expect(readyText.visible).toBe(true);
  expect(nameText.color).toBe('#ff9b72');

  player.setLeft(false);
  expect(player.left).toBe(false);
  expect(readyText.text).toBe('已准备');
  expect(nameText.color).toBe('#ffd56d');

  player.setCardCount(0);
  expect(cardCountText.text).toBe('');
  expect(cardCountText.visible).toBe(false);

  player.setTurnActive(false);
  expect(head.cleared).toBe(true);
  expect(nameText.color).toBe('#ffe7a8');

  player.setLandlord(false);
  expect(player.isLandlord).toBe(false);
  expect(head.frame).toBe('icon_default.png');
});

it('shows speech bubbles and schedules them to hide', () => {
  const player = new Player(0);
  const sayText = createTextStub();
  const delayedCall = jest.fn();

  player.attachProfileUI({
    sayText,
    game: {time: {delayedCall}},
  });
  player.say('抢地主');

  expect(sayText.text).toBe('抢地主');
  expect(sayText.visible).toBe(true);
  expect(delayedCall).toHaveBeenCalledWith(2000, sayText.setVisible, [false], sayText);
});

it('cleans cached hand ids without logging missing sprite errors', () => {
  const player = new Player(0);
  const existingPoker = {kill: jest.fn()};
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  player.pokerInHand = [3, 4];
  player._pokerPic = {3: existingPoker};
  player.cardCountText = createTextStub();

  player.cleanPokers();

  expect(existingPoker.kill).toHaveBeenCalled();
  expect(consoleSpy).not.toHaveBeenCalled();
  expect(player.pokerInHand).toEqual([]);
  expect(player._pokerPic).toEqual({});
  expect(player.cardCount).toBe(0);
  consoleSpy.mockRestore();
});
