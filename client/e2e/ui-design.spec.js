const path = require('path');
const {pathToFileURL} = require('url');
const {expect, test} = require('@playwright/test');

const expectNoHorizontalOverflow = async page => {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
};

test('login UI renders the redesigned card-room entry', async ({page}) => {
  await page.goto('/');

  await expect(page.locator('#login-title')).toHaveText('欢乐斗地主');
  await expect(page.locator('.login-panel')).toBeVisible();
  await expect(page.locator('.login-panel')).toHaveAttribute('data-ui-theme', 'happy-doudizhu');
  await expect(page.locator('.login-room-option')).toHaveCount(3);
  await expect(page.locator('.submit')).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test('game shell exposes the happy Dou Dizhu table theme', async ({page}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'e2e-token');
    window.localStorage.setItem('name', 'E2E 玩家');
    window.localStorage.setItem('uid', '42');
    window.localStorage.setItem('point', '1000');
  });
  await page.goto('/');

  await expect(page.locator('.game-shell')).toHaveAttribute('data-ui-theme', 'happy-doudizhu');
  await expect(page.locator('.ddz-table')).toBeVisible();
  const dataControls = page.getByRole('group', {name: '斗地主数据控件'});
  await expect(dataControls).toBeVisible();
  await expect(dataControls.getByText('底分')).toBeVisible();
  await expect(dataControls.getByText('倍数')).toBeVisible();
  await expect(dataControls.getByText('回合计时', {exact: true})).toBeVisible();
  await expect(dataControls.getByText('地主')).toBeVisible();
  await expect(page.getByRole('group', {name: '斗地主操作控件'})).toBeVisible();
  await expect(page.getByRole('button', {name: '叫地主', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: '托管', exact: true})).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', {name: '记牌', exact: true}).click();
  await expect(page.getByLabel('记牌器')).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test('HTML review artifact is readable without the app server', async ({page}) => {
  const reviewPath = path.resolve(__dirname, '../../docs/ui-design-review.html');
  await page.goto(pathToFileURL(reviewPath).href);

  await expect(page.getByRole('heading', {name: '欢乐斗地主桌面 UI 审核'})).toBeVisible();
  await expect(page.getByText('构建已验证')).toBeVisible();
  await expect(page.getByText('欢乐斗地主参考', {exact: true})).toBeVisible();
  await expect(page.getByText('红金大厅', {exact: true})).toBeVisible();
  await expect(page.getByText('绿色桌毡', {exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'mailgyc/doudizhu'})).toBeVisible();

  await expectNoHorizontalOverflow(page);
});
