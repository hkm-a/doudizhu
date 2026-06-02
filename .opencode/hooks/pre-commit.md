---
description: 提交前运行格式检查 + Python 编译检查 + 配置检查
mode: subagent
model: anthropic/claude-haiku-3-5
permission:
  edit: deny
  bash: allow
---

提交前执行以下检查：

1. `git diff --check` — 空白字符
2. `node --check scripts/verify.mjs scripts/setup-dev.mjs scripts/doctor-dev.mjs` — JS 语法
3. `python3 -m compileall -q server scripts/` — Python 编译
4. `node scripts/verify-config.mjs` — 配置完整性

任一失败则中止提交，并输出具体错误信息。
