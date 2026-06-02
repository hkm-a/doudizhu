---
description: Python 后端编码约定 — 类型注解、异步优先、导入顺序、测试覆盖
---

## Python 约定

- 使用 Python 3.10+ 类型注解（PEP 484）
- 异步优先：使用 `async def` + `await`，事件循环使用 `uvloop`
- 导入顺序：标准库 → 第三方 → 本地模块，每组空行分隔
- 配置通过 `.env` 环境变量读取，不硬编码
- 使用 `orjson` 替代标准 `json`（序列化性能）
- 日志使用标准库 `logging`
- 新增逻辑必须有配套测试（smoke test 或 unittest）
