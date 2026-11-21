# 发布方案

DSH 插件不是只发布到某一个官方商店。社区里常见的是三条腿并行：

1. **GitHub 仓库**：源码、Issue、Release、README、图标；
2. **npm 包**：稳定版本、版本号、依赖解析，是默认安装源；
3. **插件市场/目录**：负责发现和收录，安装时仍回到 npm、GitHub 或 `.tgz`。

`plugin-release` 技能把发布轨道分为 GitHub direct、npm registry、hub listing、collection 四种；`dsh-publish-plugin` 也默认把同一个包同时发布到 npm 和 GitHub。因此本项目采用：

```text
GitHub 主仓库
  -> npm 稳定包（主安装源）
  -> GitHub Release + .tgz（固定版本/内测）
  -> 社区市场收录（发现）
  -> 官方 Discover 索引（只有在索引收录后出现）
```

## 发布前清理

- [ ] 删除临时 `spike_*` 工具（已从 Host 源码移除）；
- [ ] 清理一次性调试命令、legacy 视图和死代码；
- [ ] 确认 storage 禁用状态已写入 README / COMPATIBILITY；
- [ ] 确认 ImportRecord 当前为内存态，并明确写出；
- [ ] 补齐 `locale/en.json`、`locale/zh.json`、`icon.svg`、`docs/DETAIL.md`；
- [ ] README 写清安装、使用、权限、限制和兼容版本；
- [ ] 版本号、`engines.dsh`、`@deepseek-ai/cordis` peer 范围与实际测试一致；
- [ ] 不在包里包含凭据、日志、本地绝对路径、`node_modules`。

## 1. GitHub 仓库

- 新建公开仓库，建议 `dsh-subagent-workbench`；
- topics：`dsh-plugin`、`deepseek-harness`、`dsh-bundle`；
- 填入 `package.json` 的 `repository`、`homepage`、`bugs`（本仓库目前留空，发布前补）；
- README 顶部放一句安装命令和一张实际截图；
- 使用本仓库的 `.github/workflows/ci.yml` 和 `.github/workflows/release.yml`。

CI 在 push / PR 上运行：

```text
npm ci -> npm run build -> npm run check -> npm run release:check
```

## 2. npm 包

发布前：

```bash
npm run build
npm run release:check
npm pack --dry-run
```

`release:check` 会检查：

- `private` 未开启；
- `dsh.bundle.patch`、`dsh.client`、`engines.dsh`、cordis peer 存在；
- `files` 包含运行时、patch、locale、docs、icon；
- `lib` 中没有 `spike_*` 工具；
- 打包文件包含必需文件；
- 如有 tag，tag 必须等于 `v${version}`。

首次发布：

```bash
npm publish
```

- scoped 包使用 `npm publish --access public`；
- 稳定版进 `latest`；
- `-rc` / `-alpha` 版本进 `next`（或项目声明的非 latest tag）；
- npm 现在要求 2FA 或带 Bypass 2FA 的 Granular Access Token；
- 不要手工改 profile 的 `package.json`，安装统一走 Plugin Manager / `dsh plugin`。

## 3. GitHub Release + .tgz

打 tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

`release.yml` 会：

1. 重新构建、检查、release-check；
2. `npm publish --provenance`；
3. `npm pack`；
4. 创建 GitHub Release，附 `.tgz` 和自动生成的 release notes。

预发布版本自动带 `--prerelease`，并发布到 npm 的 `next` tag。

## 4. 安装渠道

用户可以用三种方式：

```text
npm:      dsh plugin --profile web add dsh-subagent-workbench
GitHub:   dsh plugin --profile web add github:owner/dsh-subagent-workbench
本地包:   Web Plugins > Add plugin，选择 .tgz 或本地目录
```

稳定版推荐 npm；`.tgz` 用于固定版本和无法访问 npm 的环境；GitHub 直装解析默认分支 HEAD，不适合正式版本。

## 5. 市场收录

按投入从低到高：

1. **DSH Market**：给仓库打 `dsh-plugin` topic，或提交插件 issue；它每天扫描 GitHub topic 和提交项。
2. **dshbase / dshget / awesome-dsh-plugin**：提交仓库地址，用于发现和中文目录。
3. **官方 Discover**：读取配置的 plugin market index；需要该索引收录，不是 npm 发布后自动上架。

市场页面上的 Stars、收录量是站点数据，不等于安全审计或官方背书。插件需要外部凭据、访问网络或修改 profile 时，必须在 README 里写清楚。

## 6. 发布后验证

- [ ] 在独立 dev profile 安装 npm 包，冷启动，确认 Host 工具和 Client 槽位；
- [ ] 用 `.tgz` 再装一次，确认固定版本安装；
- [ ] 确认图标、locale、详情页、工具名和 UI 文案；
- [ ] 确认卸载/重装不会破坏 profile；
- [ ] 记录 DSH 版本和测试日期；
- [ ] 更新 CHANGELOG。

## 7. 版本与兼容

- 语义化版本；DSH 快速迭代，发布前至少测试当前稳定版和下一个 rc；
- `engines.dsh` 表示可安装范围，不能只写“latest”；
- peer `@deepseek-ai/cordis` 使用较宽范围，避免绑定单个 rc；
- 预发布不要覆盖 `latest`；
- 每次发布保留 tag 和 `.tgz`，便于回滚。

## 当前项目状态

- 包名：`dsh-subagent-workbench`；
- 版本：`0.1.0`，已发布到 npm（`latest = 0.1.0`；首次发布会留下 `0.0.0-stage` 占位版本，这是 npm staged publishing 的正常现象）；
- GitHub：`https://github.com/songling715/dsh-subagent-workbench`（repository/homepage/bugs 已写入）；
- 当前本地开发仍用 profile link 安装；
- storage/KV 禁用，ImportRecord 为内存态；
- `spike_*` 工具已移除；
- 后续发布需要配置 `NPM_TOKEN` 或本机 `npm login`；新版本仍可能进入 staged 队列，需要维护者批准。
