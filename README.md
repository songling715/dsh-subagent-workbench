# dsh-subagent-workbench

在 DeepSeek Harness 会话里**直接派发、观察、接管并行子代理**的工作台。派发默认走 `fork`：子代理继承本会话已完成的轮次，后台并行，完成后把结果以完成通知送回主会话。

> 当前版本：0.1.0 demo。Host 命令 + 右栏工作台已可用；行内回复、失败/等待状态、token/耗时统计在后续版本补充。

## 兼容性

- DSH `>= 0.2.2-rc.3`（`engines.dsh`）；实测 `0.2.2-rc.5` Desktop / Web。
- 客户端：`dsh.client.platform = web`；Host 命令 + 右栏 Tab。
- 依赖内置 `commands`、`subagents`、`client-ui-conversation`、`client-ui-subagent`、`client-store`、`client-ui-sidebar-right`；客户端服务全部用 `ctx.inject` 可选获取。
- 降级策略、更新检查与契约清单见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 安装

本地目录（开发）：

1. DSH → **Plugins** → **Add plugin**，选择本目录。
2. 或由 Agent 执行 `plugin_manager install_bundle`，`target` 指向本目录的绝对路径。
3. 安装后**重启 DSH**；会话头部出现「＋ 子代理」。

从 npm 安装（发布后）：

```text
plugin_manager install_bundle target: dsh-subagent-workbench
```

从 GitHub 安装源码（跟随默认分支 HEAD）：

```text
dsh plugin --profile web add github:songling715/dsh-subagent-workbench
```

## 使用

| 入口 | 行为 |
|---|---|
| 头部「＋ 子代理」 | 打开右侧「子代理」面板（右栏 Tab） |
| 工作台「分支」Tab | 侧栏紧凑操作：选择「导出自」会话 → 勾选提交 → 选择「导入到」目标 → 导入；右上角「视图」打开 fork 时间线（主会话进度 + 仅 fork 节点） |
| `/fork [--detach] [--name <英文名>] -- <任务>` | 派发继承上下文的子代理；不填名字自动 `agent-N` |
| `/spawn [--detach] [--name <英文名>] [--model <provider/model>] -- <任务>` | 派发全新上下文的子代理 |

面板列表直接读 `subagentCatalog` 投影，分支视图读 `branchIndex` 投影，实时同步；不再有手动刷新按钮，也不执行 `/subagents` 命令，所以不会在主会话里留下 JSON 回执。

> 名称是子代理的**地址**（`send_message`、Team 任务 owner、`reviewer/checker` 路径都用它），DSH 只接受 1–32 个小写英文字母、数字或连字符，不支持中文，也不能叫 `lead`。所以 UI 不提供名称输入，自动命名；中文任务描述就是面板里显示的那一行。

### 回报模式

面板卡片里的「完成后回报主会话」开关：

- **关（默认）**：等价于 `--detach`，走 `delivery: 'caller'`，子代理独立跑完，**不向主会话发完成通知**；需要时点行内「总结」，面板会让子代理用 `send_message` 把总结发给 lead。
- **开**：子代理结束时把结果以完成通知送回主会话。

面板行现在通过 `subagentCatalog` 投影**实时更新**，整行可点开子会话；行内固定有「停止」，已完成的可续聊行额外有「总结」。

## 实现方式

```text
Client: lib/client.js（由 src/client.js 构建）
  ├─ start: ctx.remote.commands.execute(sessionId, '/fork ...')
  ├─ list:  useProjection('subagentCatalog')（实时）
  ├─ stop:  ctx.remote.subagents.interruptByUser(childSessionId)
  └─ open:  ctx.sidebarRight.openResource('dsh-resource://subagentchat/...')

Host: lib/index.js（由 src/index.js 构建）
  └─ ctx.commands.register({ name: 'fork' | 'spawn' })
       └─ ctx.subagents.startActivation({ provider, parent, prompt, label, delivery: 'parent' | 'caller', signal, maxDepth })
```

- 不新增 Host Remote、不新增持久化：列表来自 `subagentCatalog` 投影，子代理本身由 session log 持久化。
- 子代理权限在创建时固定，需要审批的操作会被自动拒绝；想让子代理写文件，先把主会话切到对应权限模式。
- fork 的种子是**已完成轮次**的快照：不含当前进行中的一轮，之后父会话的新轮次也不同步。

## 开发

```text
src/index.js          Host 源
src/client.js         Client 源
lib/index.js          构建产物（package main）
lib/client.js         构建产物（exports ./client、dsh.client）
index.js              Loader 兼容入口（转发 lib/index.js）
cordis.patch.yml      Bundle patch（插入 Host 行）
locale/{zh,en}.json   插件标题/描述/详情页
docs/DETAIL.md        插件详情页
icon.svg              插件图标
scripts/build.mjs     src → lib 构建
scripts/check.mjs     包格式自检
```

构建与自检：

```bash
npm run build
npm run check
```

检查项：必填元数据、`main`/`exports` 指向 `lib/`、`files` 包含 `lib`/`src`、文件完整性、locale 字段、`cordis.patch.yml` 与包名一致、`lib/client.js` 的 loader id 与包名一致、`lib` 与 `src` 同步、Host 导出可加载。

## 发布

完整的 GitHub / npm / 市场发布方案见 [docs/PUBLISHING.md](docs/PUBLISHING.md)。

最短流程：

1. `npm run build && npm run check && npm run release:check`；
2. `npm pack --dry-run` 核对发布文件；
3. 补全 `repository` / `homepage` / `bugs`；
4. 打 `v0.1.0` tag，GitHub Actions 会 `npm publish` 并创建 GitHub Release + `.tgz`；
5. 在**全新 profile** 安装 npm 包验证；
6. 给仓库打 `dsh-plugin` topic，并按需提交到 DSH Market / dshbase / awesome 列表。

包名如需 scoped，必须同时改：`package.json` 的 `name`、`cordis.patch.yml` 的 `name`、`src/client.js` 的 loader id。

## 限制（0.1.0）

- 状态只区分「运行中 / 已结束」，失败、等待你处理尚未区分。
- 不支持行内回复、token/耗时、写域提示、worktree 隔离。
- 并发上限默认 8，深度默认 1（DSH 设置）。

## License

MIT
