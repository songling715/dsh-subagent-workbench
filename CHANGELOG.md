# Changelog

## 0.1.0

- Host commands: `/fork`, `/spawn`（支持 `--detach`；不填名称自动 `agent-N`）。
- 客户端入口：「＋ 子代理」头部按钮、头部工具图标、右侧栏 `sidebar.right.pane.tab`。
- 派发卡片：任务、fork/spawn、完成后回报主会话开关；**默认独立运行、不自动回报**。
- 子代理列表走 `subagentCatalog` 投影实时更新；整行点击打开子会话 Tab；行内停止/总结。
- 分支视图改为 fork 时间线：主会话进度、fork 节点、T18 任务片段和对应会话详情；不再展示长对话列表。
- 来源选择器包含全部 catalog 会话；目标切换会重挂载列表，并显示目标已有提交数或数据未加载提示。
- 官方布局：源码 `src/`，构建产物 `lib/`；`main`/`exports` 指向 `lib/`，`npm run build` 生成。
- Bundle 元数据：locale（zh/en）、icon、详情文档、`engines.dsh`。
- 移除 `spike_*` 临时工具。
- 发布：新增 `release-check`、GitHub Actions CI/Release、`docs/PUBLISHING.md`。
