# 替换占位音效为真实资产

GDD v0.2 I 章节定义了 9 个缺失音效规格。当前 `scripts/generate-placeholder-sounds.py` 已生成 9 个 sine wave 占位文件（`*_placeholder.wav`）覆盖 4 个目标位置。这些占位**不是真实音频资产**——只能用来跑通"有音效"这条链。

要替换为真实音效资产，按本文档走。

## 步骤 1：注册 Freesound 拿 API key

1. 访问 https://freesound.org/apiv2/apply/ 申请 API key
2. 在账户 Settings → API key 拿到 token
3. 同意 CC0 / CC-BY 协议（项目只接受这两类许可）

## 步骤 2：dry-run 搜索

```bash
export FREESOUND_API_KEY=<your-key>
python3 scripts/fetch-real-sounds.py --dry-run
```

这会按 GDD v0.2 I.1 规格搜索 9 个槽位，每个槽位返回 top-1 命中。**不下载**。

## 步骤 3：真下载

```bash
unset FREESOUND_API_KEY  # 不需要时 unset
python3 scripts/fetch-real-sounds.py
```

脚本会：
- 搜索每个槽位
- 下载到 `server/static/audio/{slot}.wav` 和 `client/build/static/audio/{slot}.wav`（**覆盖占位**）
- 占位文件 `*_placeholder.wav` 保留（不删，方便回滚）

## 步骤 4：替换 src-tauri bundle

下载脚本只覆盖运行时位置。桌面 bundle 需要在 `npm run tauri:build` 时重新打包：

```bash
python3 scripts/generate-placeholder-sounds.py  # 重新生成占位（如果改了生成器）
python3 scripts/fetch-real-sounds.py            # 覆盖运行时位置
npm run tauri:build                               # 重新打包桌面
```

> **注意**：bundle 复制是 build 时做的，所以**先下音频再 build**。否则 build 会用占位文件覆盖。

## 步骤 5：验证

```bash
# 1. 运行时位置
file server/static/audio/bomb.wav  # 应是真实 MP3/WAV/OGG
# 2. 桌面 bundle 位置
file src-tauri/target/release/bundle/deb/*/usr/lib/doudizhu/server/static/audio/bomb.wav
# 3. 跑 verify 门禁
npm run verify:backend
```

## 许可合规

每个下载的 Freesound 资产**必须**有 CC0 或 CC-BY 许可。脚本默认 `filter=duration` 没强制 license filter——**请在 dry-run 输出检查每条的 `license` 字段**：

- ✅ CC0（公共领域）
- ✅ CC-BY（署名）
- ❌ CC-BY-NC（禁止商业——项目不接受）
- ❌ Sampling+（需购买）

非允许许可的资产**不要写入项目**。这违反 ROOT_SYSTEM_POLICY 资产替换原则。

## 兜底：Freesound 不可用时

如果 Freesound API 不可用（限流 / 维护 / token 失效）：

1. 用 [Pixabay Audio](https://pixabay.com/audio/) 替代（同样要 CC0/CC-BY）
2. 用本地音频库（已有 .mp3 文件）
3. 手动替换：把真实文件命名为 `bomb.wav` 覆盖占位

## 自动化（CI）

未来 v0.3 可以把 Freesound fetch 加进 CI：CI 拉 token、跑 fetch、跑 verify:desktop:artifact-smoke 验证 bundle 里有真实音频。
