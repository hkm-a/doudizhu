# 斗地主 Web 客户端

这是项目的 React + Phaser 网页客户端。它负责登录入口、资源加载和牌桌画面，开发时通过 CRA dev server 代理后端接口。

## 常用命令

```bash
npm start
npm run build
npm run test:ci
```

默认开发代理指向 `http://127.0.0.1:8081`，后端登录接口接收 JSON：`{"name": "player"}`。

## 入口说明

- 无本地 token 时显示昵称登录页。
- 登录成功后保存后端返回的 `token` 和 `name`。
- 有本地 token 时直接进入 Phaser 牌桌。
