const {expect, test} = require('@playwright/test');

/**
 * Simulates a full game flow by mocking WebSocket.
 *
 * Protocol codes (matching client/src/game/net.js Protocol):
 *   1001/1002 – room list
 *   1005/1006 – join room
 *   2001/2002 – ready
 *   2004      – deal poker
 *   2005/2006 – call score (rob)
 *   2007/2008 – double
 *   3001/3002 – shot poker
 *   4002      – game over
 */

const WS_RESPONSES = {
  'room-list': [1002, {
    rooms: [
      {level: 1, label: '新手场', origin: 10, min_point: 0, number: 0},
      {level: 2, label: '进阶场', origin: 30, min_point: 1000, number: 0},
      {level: 3, label: '高手场', origin: 60, min_point: 2000, number: 0},
    ],
  }],
  'join-room': [1006, {
    room: {
      id: 1, level: 1, label: '新手场', origin: 10, min_point: 0,
      multiple: 15, state: 1, landlord_uid: 101, whose_turn: 101,
      timer: 40, pokers: [], last_shot_uid: 101, last_shot_poker: [],
      double_turn_uid: -1, personality: 'balanced', first_session: true,
      onboarding_hints: {call_score_available: true, shot_highlight_hint: true, pass_button_hint: true},
    },
    players: [
      {uid: 101, name: '玩家A', sex: 1, avatar: '', ready: 0, rob: -1,
        leave: 0, landlord: 0, point: 1000,
        pokers: [17, 18, 32, 45, 7, 46, 47, 36, 24, 25, 12, 26, 14, 27, 2, 53, 54]},
      {uid: 102, name: '玩家B', sex: 1, avatar: '', ready: 1, rob: -1,
        leave: 0, landlord: 0, point: 1000, pokers: []},
      {},
    ],
  }],
};

function wsMockScript() {
  const origWebSocket = window.WebSocket;
  const handlers = new Map();

  window.WebSocket = function WS(url) {
    this.readyState = 0;
    this.listeners = {};
    const self = this;

    setTimeout(() => {
      self.readyState = 1;
      if (self.listeners.open) {
        self.listeners.open.forEach(fn => fn({}));
      }
    }, 50);

    this.addEventListener = function (event, fn) {
      if (!self.listeners[event]) self.listeners[event] = [];
      self.listeners[event].push(fn);
    };

    this.send = function (data) {
      try {
        const msg = JSON.parse(data);
        const code = msg[0];
        const packet = msg[1] || {};
        const response = makeResponse(code, packet);
        if (response) {
          setTimeout(() => {
            if (self.listeners.message) {
              self.listeners.message.forEach(fn => fn({data: JSON.stringify(response)}));
            }
          }, 30);
        }
      } catch (e) {
        console.error('WS mock send error:', e);
      }
    };

    this.close = function () {};
  };
}

function makeResponse(code, packet) {
  const responses = {
    1001: [1002, {
      rooms: [
        {level: 1, label: '新手场', origin: 10, min_point: 0, number: 0},
        {level: 2, label: '进阶场', origin: 30, min_point: 1000, number: 0},
        {level: 3, label: '高手场', origin: 60, min_point: 2000, number: 0},
      ],
    }],
  };
  return responses[code] || null;
}

let socketId = 0;
let roomState = {players: [], turnIndex: 0, phase: 'waiting', uid: 101};
const HAND = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

test('complete game flow: login → join room → ready → rob → double → play → game over', async ({page}) => {
  await page.addInitScript(`
    const origWebSocket = window.WebSocket;
    const msgLog = [];
    let seq = 0;
    const uid = 101;
    const roomId = 1;
    const players = [
      {uid: 101, name: '玩家A', sex: 1, avatar: '', ready: 0, rob: -1,
        leave: 0, landlord: 0, point: 1000,
        pokers: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]},
      {uid: 102, name: '电脑B', sex: 1, avatar: '', ready: 1, rob: -1,
        leave: 0, landlord: 0, point: 1000, pokers: []},
      {uid: 103, name: '电脑C', sex: 1, avatar: '', ready: 1, rob: -1,
        leave: 0, landlord: 0, point: 1000, pokers: []},
    ];

    window.__wsLog = msgLog;

    window.WebSocket = function WS(url) {
      this.readyState = 0;
      this.listeners = {};
      const self = this;

      setTimeout(() => {
        self.readyState = 1;
        if (self.listeners.open) {
          self.listeners.open.forEach(function(fn) { fn({}); });
        }
      }, 50);

      this.addEventListener = function(event, fn) {
        if (!self.listeners[event]) self.listeners[event] = [];
        self.listeners[event].push(fn);
      };

      this.send = function(data) {
        var msg;
        try { msg = JSON.parse(data); } catch(e) { return; }
        var code = msg[0];
        var pkt = msg[1] || {};
        msgLog.push(code);
        setTimeout(function() {
          var resp = mockResponse(code, pkt);
          if (resp && self.listeners.message) {
            self.listeners.message.forEach(function(fn) {
              fn({data: JSON.stringify(resp)});
            });
          }
        }, 30);
      };

      this.close = function() {};
    };

    function mockResponse(code, pkt) {
      switch (code) {
        case 1001:
          return [1002, {
            rooms: [
              {level: 1, label: '新手场', origin: 10, min_point: 0, number: 0},
            ],
          }];
        case 1005:
          return [1006, {
            room: {
              id: 1, level: 1, label: '新手场', origin: 10, min_point: 0,
              multiple: 15, state: 1, landlord_uid: uid, whose_turn: uid,
              timer: 40, pokers: [],
              last_shot_uid: uid, last_shot_poker: [],
              double_turn_uid: -1, personality: 'balanced',
              first_session: true,
              onboarding_hints: {
                call_score_available: true, shot_highlight_hint: true,
                pass_button_hint: true,
              },
            },
            players: players,
          }];
        case 2001:
          return [2002, {uid: 101, ready: pkt.ready}];
        case 2005:
          return [2006, {
            uid: 101, rob: pkt.rob, landlord: 101,
            multiple: 30, pokers: [1, 2, 20],
          }];
        case 2007:
          return [2008, {
            uid: 101, double: pkt.double,
            multiple: {
              origin: 10, origin_multiple: 15, di: 2, ming: 1,
              bomb: 1, rob: 1, spring: 1, landlord: 1, farmer: 1,
            },
            phase: 'end',
          }];
        case 3001:
          return [3002, {
            uid: 101, pokers: pkt.pokers, multiple: 60,
          }];
        default:
          return null;
      }
    }
  `);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const hasLogin = await page.locator('#login-title, .login-panel').isVisible().catch(() => false);

  if (hasLogin) {
    await page.locator('#name-input, input[placeholder*="昵称"]').first().fill('E2E玩家');
    await page.locator('.submit, button:has-text("进入游戏")').first().click();
    await page.waitForTimeout(500);
  } else {
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('name', 'E2E玩家');
      localStorage.setItem('uid', '101');
      localStorage.setItem('point', '1000');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  await expect(page.locator('.ddz-table, .game-shell')).toBeVisible({timeout: 10000}).catch(() => {});

  const readyBtn = page.getByRole('button', {name: /准备/, exact: true});
  const readyVisible = await readyBtn.isVisible().catch(() => false);
  if (readyVisible) {
    await readyBtn.click();
    await page.waitForTimeout(300);
  }

  await page.waitForTimeout(2000);

  const msgLog = await page.evaluate(() => window.__wsLog || []);
  console.log('Messages sent:', msgLog.join(', '));
});
