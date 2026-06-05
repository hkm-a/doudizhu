# doudizhu

GodotMaker 驱动的 Godot 4.x 单机斗地主项目。

## 当前目录

- `IDEA.md`：给 GodotMaker 的初始游戏想法。
- `GDD.md`：首个可玩版本的设计契约。
- `_GodotMaker/`：克隆的 GodotMaker 框架源码，仅作为参考和本地工具来源。

## 运行 GodotMaker

```powershell
cd C:\Users\hkm\Documents\Code\doudizhu
godotmaker-cli --agent codex --auto-start
```

如果只想验证流程布线，不消耗长时间 Agent 运行：

```powershell
godotmaker-cli --agent codex --dry-run --auto-start
```
