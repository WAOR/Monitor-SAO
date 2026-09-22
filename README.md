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
[风格重构] Komari-Theme-SAO (作者: @WAOR，基于 Komari 探针的 SAO 极简立体风格)
    │
    ├──────────────────────────────────────────────┐
    ▼                                              ▼
[探针移植] guboysky/LuminaPlus              [探针服务端] monitor-probe/monitor (极简探针)
(社区对 Monitor 的基础移植参考)                      │
    │                                              │
    └──────────────────────┬───────────────────────┘
                           ▼
[深度融合] Monitor-SAO (本项目: @WAOR)
• 深度适配 monitor-probe/monitor 探针协议 (/api/me, /api/nodes, WebSocket)
• 原生支持多线路 Ping 自动感知与全量展示 (无需手动改配 slot 槽位)
• 内联管理员昵称实时编辑与本地持久化存储
• 访客端默认资产保密与全自动 CI/CD 打包发布
```

1. **[komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)**：原作者 `@stqfdyr` 设计并开源的初代优雅主题。
2. **[Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)**：`@shanyang242` 基于 Lumina 深度重构的增强分支，引入背景图/视频、透明度调节、总览评级、Ping/负载图表等诸多实用特性。
3. **[Komari-Theme-SAO](https://github.com/WAOR/Komari-Theme-SAO)**：`@WAOR` 基于 LuminaPlus 进行的个人二次开发分支，确立了极简立体仪表盘与护眼暗色设计体系。
4. **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)**：高性能极简 Rust 探针服务端。
5. **[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)**：社区将 LuminaPlus 引入 Monitor 探针的基础参考版本。
6. **[Monitor-SAO](https://github.com/WAOR/Monitor-SAO)**：**本项目**，将 SAO 极简立体主题全量特性完整移植至 Monitor 探针体系，并解决了一系列上游遗留的多线路显示与未登录适配痛点。

---

## 🛠️ 本主题特性与优化

- **深度适配极简探针 (monitor-probe/monitor)**：
  - 全面对接 REST API (`/api/me`, `/api/nodes`, `/api/nodes/{id}/metrics`) 与 `/api/ws` 实时双向流。
  - 针对 Monitor 无用户名体系，引入首屏专属交互：访客友好显示 `Guest`，已登录管理员支持点击铅笔就地**内联修改自定义昵称**并持久化存储。
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
- **服务器价格与资产隐私保护（现状与说明）**：
  - **默认访客保密**：默认对未登录访客隐藏节点价格及资产总值敏感信息。
  - **一键快捷显隐开关**：已登录管理员可在右上角悬浮工具栏通过眼睛图标一键切换显示/隐藏价格与资产，方便日常截图与分享。
- **CI/CD 自动化构建与发布**：
  - 配置 GitHub Actions 自动编译与 Release 打包流，发布版本时一键生成标准主题包 `theme.tar.gz` 及配套产物。

---

## ⚠️ 已知局限与待完善说明

因当前 **monitor-probe/monitor** 服务端机制原因，以下功能暂处于受限或待完善状态：
1. **向访客公开/隐藏资产全局持久化（暂未完善）**：  
   当前 Monitor 服务端未提供主题配置持久化接口（配置仅能保存在站长本地浏览器的 `localStorage`）。因此主题目前对未登录访客采取**默认保密策略**；若需实现站长在后台勾选后全网访客实时同步生效，有待官方后续提供主题配置存储 API。
2. **节点标签功能（暂不支持）**：  
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

