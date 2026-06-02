import React from 'react';
import ReactDOM from 'react-dom';
import Game from './Index';

jest.mock('phaser', () => ({
  __esModule: true,
  default: {
    AUTO: 'AUTO',
    Scale: {FIT: 'FIT'},
    Game: function Game() {},
  },
}));

jest.mock('./boot', () => ({
  BootScene: function BootScene() {},
  MenuScene: function MenuScene() {},
}));

jest.mock('./game', () => function GameScene() {});

it('creates one game instance after mount and destroys it on unmount', () => {
  const destroy = jest.fn();
  const createGame = jest.fn(() => ({destroy}));
  const div = document.createElement('div');

  ReactDOM.render(<Game createGame={createGame} />, div);

  expect(createGame).toHaveBeenCalledTimes(1);
  expect(createGame.mock.calls[0][0]).toMatchObject({
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: 0x0c392f,
  });
  expect(div.querySelector('.game-canvas')).not.toBeNull();

  ReactDOM.unmountComponentAtNode(div);

  expect(destroy).toHaveBeenCalledTimes(1);
  expect(destroy).toHaveBeenCalledWith(true);
});

it('does not create another game instance on React re-render', () => {
  const createGame = jest.fn(() => ({destroy: jest.fn()}));
  const div = document.createElement('div');

  ReactDOM.render(<Game createGame={createGame} />, div);
  ReactDOM.render(<Game createGame={createGame} />, div);

  expect(createGame).toHaveBeenCalledTimes(1);

  ReactDOM.unmountComponentAtNode(div);
});
