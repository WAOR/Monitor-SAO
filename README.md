# Monitor-Theme-SAO (Monitor-SAO)

> ⚠️ **声明：本项目为个人纯自用 / 定制二次开发分支。**  
> 本主题基于优秀开源主题 Lumina / LuminaPlus / Komari-Theme-SAO 演进，并深度移植适配至 **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)** 极简探针。  
> 如果您是在寻找或探索上游主题，**强烈推荐前往并 Star 原作者的项目**：
> - 推荐上游分支：[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)
> - 推荐初代主题：[stqfdyr/komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)
> - 社区移植参考：[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)

---

## 🌲 项目渊源与族谱

本项目的前端设计与代码演进脉络如下：

```text
[初代设计] komari-theme-Lumina (作者: @stqfdyr)
    │
    ▼
[功能扩展] Komari-Theme-LuminaPlus (作者: @shanyang242 / @shark)
    │
    ▼
[家族演进] Komari-Theme-SAO / SAO-CFSM (作者: @WAOR)
    │
    ▼
[最新融合] Monitor-SAO (本项目: @WAOR)
• 深度适配 monitor-probe/monitor 探针协议 (/api/me, /api/nodes, WebSocket)
• 深度重构首屏加载管线，体感速度显著超越我们之前的 SAO-CFSM 与 Komari 版本，真正实现“瞬时秒开”
• 原生支持多线路 Ping 自动感知与全量展示 (无需手动改配 slot 槽位)
• 支持极简探针原生服务器分组与官方主题配置标准持久化
• 访客端默认资产保密与全自动 CI/CD 打包发布
```

1. **[komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)**：原作者 `@stqfdyr` 设计并开源的初代优雅主题。
2. **[Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)**：`@shanyang242` 基于 Lumina 深度重构的增强分支，引入背景图/视频、透明度调节、总览评级、Ping/负载图表等诸多实用特性。
3. **[Komari-Theme-SAO](https://github.com/WAOR/Komari-Theme-SAO) / SAO-CFSM**：`@WAOR` 基于 LuminaPlus 进行的个人二次开发分支，确立了极简立体仪表盘与护眼暗色设计体系。
4. **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)**：高性能极简 Rust 探针服务端。
5. **[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)**：社区将 LuminaPlus 引入 Monitor 探针的基础参考版本。
6. **[Monitor-SAO](https://github.com/WAOR/Monitor-SAO)**：**本项目**，将 SAO 极简立体主题全量特性完整移植至 Monitor 探针体系。

---

## ⚡ 极致加载速度与首屏性能优化

相比我们之前开发的 **SAO-CFSM** 版本以及 **Komari-Theme-SAO** 历史版本，本项目在极简探针体系下对前端加载管线进行了深度重构与优化，在弱网或日常网络环境下均有非常强烈的**“秒开”**体感提升：

1. **首屏早期数据并行预取（Early Data Prefetching）**：
   在 HTML 刚开始解析的头部内联脚本中，与 CSS/JS 资源下载**完全并行同步发起** `/api/me` 和服务端配置请求。彻底打破传统 SPA “HTML ➡️ 下载 JS ➡️ 执行 JS ➡️ 发起 API” 的漫长串行瀑布流，数据与应用几乎同时就绪。
2. **分包构建极致收敛（Smart Chunk Splitting）**：
   将重量级的趋势图表组件（uPlot）、状态校验库等进行精细化拆包与按需懒加载，首页核心 JS 关键加载体积缩减至极致，主线程解析时间大幅缩短。
3. **现代基线原生色彩与样式（Zero-Polyfill）**：
   全面基于现代浏览器原生的 CSS `color-mix()` / `oklch` 色彩系统与现代 CSS 变量驱动，彻底剥离过时的 Polyfill 运行时，CSS 渲染管线极其纯净。
4. **字体本地自托管与分集预载**：
   自托管现代化 Inter Variable 字体，本地打包并使用现代 WOFF2 格式分集加载，彻底剔除外部公共 CDN（如 Google Fonts）的网络阻断风险与延迟。
5. **高效单例 WebSocket 订阅流**：
   重构 WebSocket 数据流分发中心，高频指标变化定向精准更新对应组件，杜绝全局不必要的 DOM 级联重复 re-render，降低长开挂机时的 CPU 消耗。
6. **磨砂立体骨架屏秒级占位（Instant Skeleton Render）**：
   首屏彻底消除传统 SPA 让人烦躁的“大白屏”与“转圈等待”，核心框架就绪后瞬间呈现 1:1 严格对齐 SAO 仪表盘的立体呼吸骨架；配合早期数据预取，数据落地后平滑无缝蜕变为真实界面。

---

## 🛠️ 本主题特性与最新优化

- **深度适配极简探针 (monitor-probe/monitor)**：
  - 全面对接 REST API (`/api/me`, `/api/nodes`, `/api/nodes/{id}/metrics`) 与 `/api/ws` 实时双向流。
  - **原生对接服务器分组 (group)**：完整支持官方节点分组（PR #51），首页自动激活分组 Tab 标签栏，支持点击一键切换筛选，卡片副标题与管理页自动联动分组信息。
  - **服务端主题配置标准持久化**：深度支持官方 `GET/PUT /api/themes/{short}/config` 规范，外观配色、桌面/移动端布局、图表偏好等配置全网跨设备统一生效。
  - **管理员自定义昵称**：支持在官方后台或前端首页点击铅笔内联修改。
  - **全站置顶公告 Banner**：支持后台配置 Markdown/文本公告并在首页顶部高亮展示。
- **Auto Multi-Ping 多线路自适应技术**：
  - 彻底解决上游移植版硬编码固定 3 线路、需站长手动 SSH 修改配置文件的痛点。
  - 智能感知后台启用的全部测速线路，无论是 3 条还是 7 条线路，访客端无需任何手动配置均可**全量自适应展示**。
- **极简立体仪表盘设计**：
  - **毛玻璃顶部导航栏**：采用高质感磨砂玻璃材质与自适应品牌标题，布局清晰紧凑。
  - **监控总览双栏卡片**：
    - **核心指标区**：集成关键运维指标卡片（实时速率、全站流量、在线比例、临期提醒、资产总值等），支持悬浮立体微投影与平滑悬停动效。
    - **集群状态区**：内置分段式服务器在线率状态指示格与全站实时网络吞吐动态平滑波形图。
  - **灵动流光问候语**：首屏顺滑流光入场，搭配轻量呼吸流光动效，支持按不同时段智能切换贴心问候。
- **全新护眼与极简深色体验**：
  - **浅色护眼模式**：采用分层护眼浅灰底色与纯白立体悬浮卡片，告别强白光眩目感。
  - **深色极简碳黑模式**：采用纯粹中性碳黑调色体系，无杂色泛蓝，暗色环境观感更加深邃沉浸。
- **shadcn/ui 风格临期提醒悬浮卡片**：
  - 采用轻量磨砂半透悬浮卡片（HoverCard），鼠标悬停即开即停，操作自然丝滑。
  - 智能 7 天临期预警机制，与全站状态保持精确一致。
- **服务器价格与资产隐私保护**：
  - **默认访客保密**：默认对未登录访客隐藏节点价格及资产总值敏感信息。
  - **一键快捷显隐开关**：已登录管理员可在右上角悬浮工具栏通过眼睛图标一键切换显示/隐藏价格与资产，方便日常截图与分享。
- **CI/CD 自动化构建与发布**：
  - 配置 GitHub Actions 自动编译与 Release 打包流，发布版本时一键生成标准主题包 `theme.tar.gz` 及配套产物。

---

## ⚠️ 已知局限、待完善功能与 BUG 记录

### 1. 测速峰值速度记录不准问题（核心根因与当前边界说明）

- **现象描述**：  
  在对节点进行 Speedtest 等突发大流量测速时，测速进行中前端能正常看到实时数百 Mbps 的高峰值；但**测速一旦结束，卡片浮窗内的今日最高峰值会被瞬间拉低**（常常缩水成几十甚至几 Mbps）。
- **底层技术根因（服务端时序聚合机制）**：  
  极简探针（monitor-probe）服务端为节约数据库空间与服务器 I/O，历史数据采用 **1 分钟或 5 分钟时间片平均加权落库**。一次 15 秒的测速突发（例如 358 Mbps）与后续 45 秒的闲置状态（0 Mbps）在服务端落库时会被整窗口平摊，折算后存入 SQLite 的数值仅有：
  $$358\text{ Mbps} \times \frac{15\text{s}}{60\text{s}} \approx 89.5\text{ Mbps}$$
  测速结束后实时速率归零，若前端仅读取服务端历史采样点，峰值就会严重缩水。
- **当前 SAO 主题的处理方案（v1.0.9+）**：  
  主题在前端引入了 **「今日瞬时峰值持久锁存（Daily Peak Storage）」** 机制。WebSocket 每 2 秒推送一次快照，一旦捕获到当天的更高瞬时速率，立即按日期（`YYYY-MM-DD`）锁存在浏览器本地。测速结束后流速归零**绝不回落**，浮窗依然稳稳展示当天的真实最高峰值与精确发生时间，跨页面刷新依然保留。
- **当前的物理边界（何时依然会不准？）**：  
  由于该锁存依赖 WebSocket 前端实时捕获：  
  - ✅ **人工测速场景（开着面板测速）**：100% 能够精准锁存真实最高峰值；  
  - ❌ **无人值守/夜间离线测速**：若测速发生时**完全没有打开任何探针网页**（例如通过 Linux crontab 凌晨跑自动化测速），浏览器错过了实时 WebSocket 推流。第二天打开网页补读时，仍只能从服务端获取被平均化稀释后的历史数据。  
  *（注：若需彻底实现 24 小时全天候离线极值记录，有待探针服务端在 Hub 处理 Agent 上报时增加原生 `today_peak` 极值字段支持）。*

### 2. 节点标签功能（暂不支持）
Monitor 探针官方目前未提供节点标签（Tags）字段，因此原 Komari 体系下的线路色彩药丸标签功能暂处于冻结状态。

---

## 💻 本地开发与调试

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 浏览器访问（支持 Mock 节点数据）
http://localhost:5173/?mock=1
```

---

## 💖 致谢

- 特别感谢 **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)** 提供极简高效的探针监控服务端。
- 特别感谢 **[stqfdyr/komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)** 开源了初代 Lumina 主题。
- 特别感谢 **[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)** 的优秀工作与丰富功能扩展。
- 特别感谢 **[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)** 在 Monitor 探针主题移植上的先行探索。
- 特别感谢 **[Montia37/komari-theme-purcarte](https://github.com/Montia37/komari-theme-purcarte)** 提供视频背景的设计思路与素材。

---

## 🔗 参考链接

- [Monitor 官方仓库](https://github.com/monitor-probe/monitor)
- [Monitor 主题开发文档](https://monitor-document.pages.dev/dev/theme)
- [komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)
- [Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)
- [guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)
- [Radix UI Colors 文档](https://www.radix-ui.com/themes/docs/theme/color)
