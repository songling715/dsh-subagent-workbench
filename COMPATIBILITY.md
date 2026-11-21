# Compatibility

## Tested

| DSH | Result |
|---|---|
| `0.2.2-rc.3` (Desktop, Web) | 早期联调版本；面板、派发、停止、打开可用 |
| `0.2.2-rc.5` (Desktop) | 当前实测：冷启动直接出现头部入口；派发、实时列表、行点击打开、停止、总结、独立运行均验证 |

## Hard contract

Host:

- `ctx.commands.register()` — `/fork`、`/spawn`
- `ctx.subagents.startActivation()` / `rootOf()` / `listDescendants()`

Client:

- `ctx.slots.register` / `ctx.slots.inject`（注入具体子槽位，不注入父槽位）
- `conversation.session.header.actions`、`conversation.session.header.utilities`
- `sidebar.right.pane.tab` + `ctx.sidebarRightTabs.register` + `ctx.sidebarRight.openTab`
- `ctx.remote.commands.execute`、`ctx.remote.subagents.interruptByUser`、`ctx.remote.subagents.prompt`

## Degradation

- 客户端只硬注入 `slots`；`remote`、`remote.commands`、`remote.subagents` 通过可选 `ctx.inject` 获取，缺失时面板显示错误而不是让插件消失。
- 右栏 Tab 类型注册失败会重试；`openTab` 不可用时弹出诊断（`sidebarRight=… openTab=… sidebarRightTabs=… typeReady=…`）。
- 投影读取（`subagentCatalog`、`sessionStats`）都有 try/catch；某个投影在新版本被移除时，顶部胶囊退回 0，继承轮次退回无数字文案。
- 客户端包注入只保留 `client-ui-conversation`；其余服务运行时可选查找。
- 客户端必须注入具体子槽位（`conversation.session.header.actions` / `.utilities`）；注入父槽位 `conversation.session.header` 会在冷启动时子槽位尚未声明，`register` 抛错。
- 头部胶囊复用原生 `subagent-catalog` id；没有 `client-ui-subagent` 的注入顺序保证时，可能由原生胶囊胜出，功能不受影响。

## Before updating

1. 插件是本地 `link:` 安装，profile 的依赖和 bundle 选择在升级后保留。
2. 更新 DSH 后重启（Desktop 没有 Ctrl+R，直接重启 App）：
   - 能出现「＋ 子代理」→ 顶部胶囊显示子代理数量；
   - 不出现 → F12 看 `[subagent-workbench]` 开头的日志。
3. 如果新版本改了 `sidebar.right.pane.tab` 或 `ctx.subagents` 契约，按日志改对应注册；无需改 package 结构。

## Package policy

- `engines.dsh: ">=0.2.2-rc.3"`（rc.5 满足）。
- 官方布局：源码在 `src/`，`main`/`exports` 指向 `lib/`；`npm run build` 由 `scripts/build.mjs` 从 `src/` 生成 `lib/`。
- 不依赖 `0.2.2-rc.4/rc.5` 的新增 API；只用 rc.3 已存在的接口。
