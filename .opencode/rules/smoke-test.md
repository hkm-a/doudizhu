---
description: Smoke test 编写约定 — 路径、运行方式、断言模式
---

## Smoke Test 约定

- smoke test 放在 `scripts/` 目录，命名 `*-smoke.py` 或 `*-smoke.mjs`
- 运行需 `PYTHONPATH=server` 环境变量（Python smoke）
- 统一结构：setup → act → assert → cleanup
- 成功输出 `{name}-ok`，失败抛异常（exit code 非零）
- 不依赖外部服务（MySQL、网络），除非测试目标就是数据库连接
- 通过 `npm run verify` 触发的 smoke 必须可独立运行
