# AGENTS.md

本文件给后续在本仓库工作的 Codex/Agent 使用。开始任何修改前，先读本文件，再读相关文档和源码。

## 项目概况

- 项目名称：`three-kingdoms-h5`。
- 目标：三国题材 H5 单机回合制策略游戏，支持桌面和手机浏览器。
- 当前实现是轻量版：玩家选择势力、城池规模、路线密度和难度；地图为 SVG 叠加地形图；核心操作是自动增兵、调兵、进攻、结束回合和 AI 行动。
- 完整 V1 目标见 `three-kingdoms-v1-acceptance.md` 与 `three-kingdoms-v1-plan.md`。不要把完整 V1 文档中尚未实现的武将、城防、征兵、修城、QA 场景、存档等功能误判为当前已完成。

## 重要文档

- `three-kingdoms-v1-acceptance.md`：最终 V1 验收标准。真正宣称 V1 完成时必须按这里做浏览器验收、截图和报告。
- `three-kingdoms-v1-plan.md`：完整产品与技术方案。
- `design-qa.md`：当前视觉 QA 状态。最近结论是浏览器截图证据被阻塞，不能仅凭源码声明视觉通过。
- `docs/historical-sources.md`：历史数据与素材来源说明，涉及素材和历史表述时必须维护。
- `docs/superpowers/specs/` 与 `docs/superpowers/plans/`：近期设计规格和实施计划，尤其是地图路线遮挡、战局配置、AI 演出等历史决策。

## 技术栈与运行命令

```bash
npm run build
npm test
npm run dev
```

- `npm run build` 会把 `src/game/*.ts` 通过 Node `stripTypeScriptTypes` 转成 `public/game/*.js`。
- `npm test` 使用 Node 内置 test runner，并带 `--experimental-strip-types`。
- `npm run dev` 会先 build，再用 `scripts/serve.mjs` 启动静态服务器，默认地址是 `http://127.0.0.1:4173/`。如端口被占用，可用 `PORT=4174 npm run dev` 或 `node scripts/serve.mjs 4174`。
- 该项目没有 bundler 配置文件；前端直接从 `public/index.html` 加载 `public/app.js`、`public/map-canvas.js`、`public/game/*.js` 和本地 vendor React 文件。

## 代码结构

- `src/game/`：核心规则、场景、AI、回合演出和单元测试。规则模块应保持纯逻辑，不依赖 DOM、React 或地图渲染。
- `public/app.js`：React 应用入口和主要 UI。当前是手写 JS，不由 `src/` 生成。
- `public/map-canvas.js`：SVG 策略地图渲染、城市节点、路线、行动演出。
- `public/styles.css`：全部页面样式和响应式布局。
- `public/assets/three-kingdoms-terrain.png`：当前地形素材。
- `public/vendor/`：本地 React 运行文件。除非升级 React 或许可证处理，不要随意改动。
- `public/game/*.js`：由 `npm run build` 生成。修改 `src/game/*.ts` 后必须重新 build，让生成文件同步。

## 当前游戏规则边界

当前轻量版规则：

- 三个势力：`wei`、`shu`、`wu`，行动顺序定义在 `src/game/scenario.ts` 的 `FACTION_ORDER`。
- 地图规模：12、21、33 城；路线密度：sparse、standard、dense；难度只影响玩家初始兵力。
- 回合开始时自动增兵：普通城市低于 6 兵、首都低于 8 兵时 +1。
- 每个势力回合最多 2 次行动。
- 调兵只能去相邻己方城市。
- 进攻只能打相邻敌方城市。
- 出发城市必须至少保留 1 兵。
- 战斗是确定性的兵力比较：出兵数大于守军数则占领，否则守住；没有随机数。
- 胜利：某势力占领另外两个势力首都；玩家胜出显示 victory，否则 defeat。玩家失去全部城市也失败。

完整 V1 计划中的武将克制、城防、征兵、修城、撤退、存档、`?qa=1` 场景和 Three.js 3D 地图尚不是当前实现的一部分。添加这些功能前要同步更新源码、UI、测试、验收文档和浏览器验收流程。

## 测试与验收要求

- 任何规则变更至少运行 `npm test`。
- 修改 `src/game/*.ts` 后必须运行 `npm run build`，再运行 `npm test`，确认 `public/game/*.js` 与源码一致。
- 修改 UI、样式、地图或交互后，除了自动测试，还要启动本地预览并用真实浏览器检查桌面和手机视口。不能只凭源码声明视觉或交互通过。
- `design-qa.md` 记录过 Codex in-app Browser 初始化失败：`Cannot redefine property: process`。如果浏览器验收仍受阻，要明确写成 blocked，不要写 PASS。
- 真正进行完整 V1 验收时，必须按 `three-kingdoms-v1-acceptance.md` 生成 `artifacts/acceptance/report.md`、`results.json` 和必需截图；任何缺失截图、核心用例失败或发布阻断问题都应判定为 `FAIL`。
- 现有 `src/app-contract.test.mjs` 是源码/静态资源合同测试。它会检查稳定 `data-testid`、文案边界、地图渲染结构、离线资源和公开模块数量。改 UI 时先看这个测试，避免破坏自动化定位。

## 地图与路线约束

- 城市坐标固定在 `src/game/scenario.ts` 的 `CITY_DEFINITIONS`。
- 路线由城市顺序、路线密度和边境路线表生成，再无向去重。
- 不要在运行时加入路线投影、路线切分、避让或几何重算逻辑。路线遮挡问题应通过调整固定坐标并用测试验证。
- 国内路线/跨国路线的显示分类基于 `originalOwner`，不是当前 `owner`。城市被占领后，原始跨国虚线不应变成实线。
- 33 城地图在手机上需要保持可平移、可读，注意 `map-size-33` 的响应式约束。

## UI 与可访问性约束

- 稳定的 `data-testid` 是验收合同的一部分。改名或删除前必须同步测试和验收文档。
- 城市节点需要保持点击和键盘操作可用：`role="button"`、禁用态、`tabIndex` 和 `aria-label` 都要谨慎维护。
- AI 或行动演出期间应锁定城市交互，防止重复操作、重复占城或重复结算。
- 战报区域和行动横幅使用 `aria-live`，改动时保持可读的状态反馈。
- 手机端优先检查 390x844 竖屏和 844x390 横屏，避免按钮、标签、面板相互遮挡或文字溢出。
- 项目使用中文玩家文案。新增文案应清晰、短句、面向低门槛玩家，不引入隐藏规则或复杂术语。

## 素材与版权

- 当前地形图由 OpenAI 图像生成工具为项目生成，说明在 `docs/historical-sources.md`。
- React vendor 文件需要保留 MIT 许可说明，见 `public/vendor/LICENSE.react.txt`。
- 商业发布前，地形、水系、海岸线和历史数据需要明确再发布许可；不要直接重新分发未确认许可的 CHGIS 完整数据。
- 不要复制现有三国游戏、帝国时代或其他第三方游戏的角色、UI、地图或素材。

## 工作习惯

- 先读相关文档和测试，再改代码。
- 保持改动小而完整：源码、生成文件、测试和文档需要一起更新时不要漏项。
- 不要修改 `.DS_Store` 或无关 vendor/minified 文件。
- 如果发现当前实现与完整 V1 文档冲突，先区分“当前轻量版行为”和“未来 V1 目标”，再决定是修代码、改测试还是更新文档。
