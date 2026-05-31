# Security Policy

## Supported Versions

当前项目处于桌面端原型阶段，`master` 分支是唯一维护线。公开发布包成熟后会在这里列出受支持版本。

## Reporting a Vulnerability

请不要把可利用的安全细节直接发到公开 issue。你可以通过 GitHub Security Advisory 或仓库维护者可用的私下渠道报告。

报告时请尽量包含：

- 受影响的提交、版本或构建方式。
- 复现步骤和预期影响。
- 相关日志、请求样例或截图，但不要包含真实用户隐私、生产密钥或第三方访问令牌。

## Current Risk Areas

- 本地 Tornado 后端、WebSocket 协议和管理员接口。
- 桌面端自动拉起 Python 后端的环境变量、端口和资源路径。
- MySQL 连接配置和本地 `.env`。
- 未来 DouZero 模型文件、对局日志和 AI 推理适配层。

## Disclosure

我们会优先确认复现、评估影响、修复并在必要时发布说明。修复前请给维护者合理处理时间。
