import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Github,
  HelpCircle,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { PROJECT_REPOS } from "../constants";

type FaqCategory = "all" | "network" | "asset" | "visual" | "general";

interface FaqItem {
  id: string;
  category: "network" | "asset" | "visual" | "general";
  categoryLabel: string;
  q: string;
  keywords: string[];
  renderAnswer: () => React.ReactNode;
}

const FAQ_CATEGORIES: Array<{ id: FaqCategory; label: string }> = [
  { id: "all", label: "全部问题" },
  { id: "network", label: "网络测速" },
  { id: "asset", label: "资产财务" },
  { id: "visual", label: "微图与大盘" },
  { id: "general", label: "开源与反馈" },
];

export function HelpTab({
  currentVersion,
  hasUpdate = false,
}: {
  currentVersion: string;
  hasUpdate?: boolean;
}) {
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const faqItems: FaqItem[] = useMemo(() => [
    {
      id: "theme-license",
      category: "general",
      categoryLabel: "开源与反馈",
      q: "可以把主题修改后发布到探针主题市场吗?",
      keywords: ["开源", "修改", "发布", "授权", "协议", "版权", "二次开发"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      非常欢迎你基于本项目修改或开发满足自己需要的分支。如果你的修改版本和原版 SAO 风格高度相似，为了避免给其他用户带来辨认和混淆困扰，建议不要将高相似度的衍生主题直接上架到官方市场；当然这只是一条友好的建议，并不构成硬性限制。
                    </div>
      ),
    },
    {
      id: "feedback-tips",
      category: "general",
      categoryLabel: "开源与反馈",
      q: "提交反馈时，怎么描述能更快得到解决?",
      keywords: ["反馈", "Issue", "复现", "环境", "截图", "提单"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2">
          <p className="text-(--text-primary) font-medium">
            提交 GitHub Issue 时，请尽量写明以下信息：
          </p>
          <ol className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
            <li>
              <strong>1. 问题描述：</strong>具体说明你遇到的情况，以及原本期望达到的效果。
            </li>
            <li>
              <strong>2. 运行环境：</strong>注明你使用的设备与浏览器信息。
            </li>
            <li>
              <strong>3. 问题截图：</strong>如有条件，请附上相关的 Bug 截图。
            </li>
            <li>
              <strong>4. 功能建议：</strong>若为新功能提议，请先评估该需求是否属于大众通用需求，而非个人偏好。
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "today-traffic-histogram-scale",
      category: "visual",
      categoryLabel: "微图与大盘",
      q: "今日流量卡片微图的展示逻辑是什么？",
      keywords: ["今日流量", "直方图", "微图", "柱状图", "相对归一化", "渲染", "撑满", "比例"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
          <p className="text-(--text-primary) font-medium">
            <strong>微图的核心目的在于展现「相对走势」，而非「绝对容量」：</strong>
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                1. 相对归一化算法 (Auto-scaling Trend)
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                微图的 7 根立柱对应<strong>过去 6 小时 + 当前小时</strong>的时序吞吐。算法会取这 7 小时内部的<strong>「最高流量小时」作为 100% 满高基准</strong>，其他柱子按比例与峰值对比。
              </p>
              <p className="text-(--text-secondary) leading-relaxed">
                这意味着：即便机器夜间总共只跑了 300 MB，若其中某个小时跑了 150 MB，该小时也会达到满格高度；其设计意图是让您一眼看出<em>“哪几个小时有流量波动、用量集中在何时”</em>，而不是用来与上百 GB 的月度总配额做对比。
              </p>
            </div>
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                2. 为什么最右侧柱子通常较矮？
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                最右侧带有发光脉冲点的立柱代表「当前小时」。由于当前小时可能才刚开始数分钟，累积吞吐远小于过去已跑满 60 分钟的历史小时，因此会呈现自然的阶梯反差，精准还原时间维度的实时推进。
              </p>
            </div>
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                3. 如果想要平稳展示怎么办？
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                若您偏好始终维持平稳起伏、不随低流量小时剧烈放大的图表氛围，可在对应卡片右上角关闭动态展示。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "carrier-loss",
      category: "network",
      categoryLabel: "网络测速",
      q: "三网丢包卡片的显示逻辑与算法是怎样的?",
      keywords: ["丢包", "三网", "算法", "未启用多线", "等待测速数据", "电信", "联通", "移动", "峰值", "均值"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
          <p className="text-(--text-primary) font-medium">
            卡片遵循<strong>「主数值提示风险，辅助层细分归因」</strong>的原则，把复杂的网络质量提炼为直观指标：
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                1. 哪些线路会被统计？（为什么显示「未启用多线」或「等待测速数据」？）
              </div>
              <div className="text-(--text-secondary) leading-relaxed space-y-1.5">
                <p>
                  • <strong>未启用多线模式：</strong>若在【主题设置 → 服务器 → 网络延迟】中选择了「单线模式」，系统无法区分三网样本，卡片会提示 <code>未启用多线模式</code> 并处于静默待机状态。
                </p>
                <p>
                  • <strong>智能识别规则：</strong>切换为「多线模式」后，系统会自动扫描多线槽位绑定的任务名称（不区分大小写），精确识别三大运营商：
                </p>
                <div className="rounded-lg bg-[color-mix(in_srgb,var(--bg-card)_90%,transparent)] p-2.5 border border-(--hairline) space-y-1 font-mono text-[10.5px]">
                  <div>• <span className="text-emerald-500 font-bold">电信 (CT)</span>：包含 <code>电信</code>、<code>中国电信</code>、<code>ct</code>、<code>chinatelecom</code></div>
                  <div>• <span className="text-blue-500 font-bold">联通 (CU)</span>：包含 <code>联通</code>、<code>中国联通</code>、<code>cu</code>、<code>chinaunicom</code></div>
                  <div>• <span className="text-amber-500 font-bold">移动 (CM)</span>：包含 <code>移动</code>、<code>中国移动</code>、<code>cm</code>、<code>chinamobile</code></div>
                </div>
                <p>
                  • <strong>等待测速数据：</strong>若多线任务名称中均未包含上述关键词，系统保持严格真实性，主数值显示 <code>—</code>，底部提示 <code>等待测速数据</code>，右侧微图保持静止基线待机。
                </p>
              </div>
            </div>

            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                2. 主屏大字：三网峰值丢包率 (Peak Loss)
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                卡片左侧最醒目的大数字显示的是<strong>电信、联通、移动三者中的最高丢包率（<code>Math.max(CT, CU, CM)</code>）</strong>。在网络运维中，“木桶最短板”决定了访问下限，展示峰值能确保任何单网劣化（如移动暴卡、联通炸线）第一时间被察觉，而不是被其他平稳网络平均稀释掉。
              </p>
            </div>

            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                3. 副标与微图：三网独立均值对比 (CT / CU / CM)
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                底部副标分别呈现 <code>CT % · CU % · CM %</code> 三网独立算术平均丢包率；右侧的 3 根彩色能量柱（或微图）亦分别与三大运营商对应，柱高与颜色动态映射当前线路质量（健康绿 / 预警黄 / 告警红）。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "no-yesterday-best-card-monitor",
      category: "network",
      categoryLabel: "网络测速",
      q: "为什么当前主题没有稳定评分卡片？",
      keywords: ["稳定评分", "网络评分", "天梯榜", "昨天表现最佳", "没有", "卡池", "503", "并发", "HISTORY_GATE"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
          <p className="text-(--text-primary) font-medium">
            <strong>核心原则：保障全站极速响应与稳定性，坚决拒绝卡顿排队与 503 报错风险。</strong>
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                1. 探针 API 粒度限制与 N 倍网络往返
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                Monitor 探针的历史指标接口为单节点独立请求（<code>/api/nodes/&#123;id&#125;/metrics</code>）。当站长拥有 15~30 台节点时，若要在首页统计全站 24 小时评分，前端必须瞬间打出数十次独立的 HTTP 请求，这会导致卡片长时间处于占位符等待状态。
              </p>
            </div>
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                2. 后端并发门闸与 503 报错风险
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                Monitor 探针后端为了保护底层 SQLite 数据库，设置了严格的历史查询并发控制（最大允许 4 并发槽位）。一旦多名访客同时打开网站，前端并发请求会迅速耗尽槽位，直接导致后端抛出 <code>503 Service Unavailable</code> 甚至雪崩。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "cost-float-button",
      category: "asset",
      categoryLabel: "资产财务",
      q: "为什么开启了悬浮入口后页面上没看到?",
      keywords: ["悬浮", "入口", "按钮", "资产", "隐藏", "浮窗"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      页面右下角的「悬浮入口」和首页顶部的「资产总值小卡」是<strong>自动互斥</strong>的：如果首页顶部已经放了资产总值卡片，右下角就不会再多放一个重复的悬浮球；只有当你在顶部卡片里把资产卡换掉（或关闭了顶部总览）时，右下角的悬浮按钮才会自动出现，避免界面重复拥挤。
                    </div>
      ),
    },
    {
      id: "asset-calculating",
      category: "asset",
      categoryLabel: "资产财务",
      q: "为什么资产总值卡片有时显示「计算中」？",
      keywords: ["计算中", "汇率", "缓存", "API", "币种", "价格", "资产总值"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
                      <p className="text-(--text-primary) font-medium">
                        资产总值需根据各节点的购置价格与周期，通过<strong>实时外币汇率</strong>统一折算为人民币呈现：
                      </p>
                      <div className="space-y-2 text-[11px]">
                        <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1">
                          <div className="font-semibold text-(--text-primary)">
                            1. 为什么会出现「计算中」？
                          </div>
                          <p className="text-(--text-secondary) leading-relaxed">
                            主题默认采用公用开源的 <code>api.frankfurter.dev</code> 汇率服务。当该海外源站偶发宕机维护、遭遇网络丢包或 Cloudflare 522 连接超时时，浏览器必须等待接口返回或超时，期间卡片便会持续呈现「计算中」。
                          </p>
                        </div>

                        <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1">
                          <div className="font-semibold text-(--text-primary)">
                            2. 该如何彻底解决？
                          </div>
                          <p className="text-(--text-secondary) leading-relaxed">
                            在主题设置的「资产」板块中，点击预设按钮一键切换到其他预设汇率接口，或者填写你自定义的汇率接口。
                          </p>
                        </div>
                      </div>
                    </div>
      ),
    },
    {
      id: "asset-value-vs-remaining",
      category: "asset",
      categoryLabel: "资产财务",
      q: "资产总值卡片为什么始终显示总值？",
      keywords: ["资产", "总值", "剩余价值", "残值", "卡片", "仪表盘", "移动端"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
          <p className="text-(--text-primary) font-medium">
            <strong>第一眼只给最核心的答案：</strong>「资产总值」卡片的核心认知焦点是服务器集群的<strong>资产建置规模与采购总投入（总值）</strong>。
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                1. 明确的主次视觉层级 (Visual Hierarchy)
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                卡片的主数值属于<strong>第一级视觉层</strong>，必须承担统领性的总览职责（总价值）；而「剩余价值」属于衍生维度的补充信息，被清晰归纳在<strong>底部辅助副标</strong>以及<strong>右侧指标微图</strong>中，避免将两个相互冲突的大数值挤在主屏造成理解负担。
              </p>
            </div>
            <div className="rounded-xl p-3 bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] border border-(--hairline) space-y-1.5">
              <div className="font-semibold text-(--text-primary)">
                2. 移动端与紧凑屏幕下的直觉呈现 (Don't Make Me Think)
              </div>
              <p className="text-(--text-secondary) leading-relaxed">
                在窄屏或移动端，为了保持版面整洁呼吸感，卡片可能会自动隐藏底部次要辅助文本。但此时右侧的<strong>专属仪表盘微图</strong>仍会忠实根据剩余价值与总价值的实际比例进行动态填充，一眼扫视即可大致感知剩余价值与资金消耗进度，无需费心点击或切换。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "mini-card-slot",
      category: "network",
      categoryLabel: "网络测速",
      q: "迷你卡片和列表的延迟信息来自哪个槽位?",
      keywords: ["迷你卡片", "槽位", "延迟", "线路", "多线", "首选"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      在迷你小卡和紧凑列表视图中，受单行版面空间限制，每个服务器节点只会呈现一条最核心的延迟与丢包指标。因此主题会自动抓取「槽位 #1」的实时延迟数据进行呈现。无论处于哪种展示模式，「槽位 #1」始终作为核心延迟测试线路。
                    </div>
      ),
    },
    {
      id: "matrix-curve-toggle",
      category: "visual",
      categoryLabel: "微图与大盘",
      q: "集群状态怎么在双曲线图与方块矩阵间切换?",
      keywords: ["大盘", "双曲线", "方块矩阵", "开屏动效", "切换", "矩阵"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      在设置菜单切换到「总览」，找到「SAO 集群状态模块」区域，直接点击即可一键切换：「SAO 趋势大盘」适合看整体网络流速与在线率趋势，「SAO 方格矩阵」适合快速扫视每台机器是否正常。
                    </div>
      ),
    },
    {
      id: "sparkline-dynamic",
      category: "visual",
      categoryLabel: "微图与大盘",
      q: "哪些指标卡片微图会随数据变化？",
      keywords: ["微图", "动态", "静态", "图表", "直方图", "折线", "虚假"],
      renderAnswer: () => (
        <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed space-y-2.5">
                      <p>
                        卡片左侧大数字全部来自真实监控数据，右侧微图分为以下三类：
                      </p>
                      <div className="rounded-xl bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] p-3 border border-(--hairline) space-y-2">
                        <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                          对接了真实数据的微图：
                        </div>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                          <li><strong>内存用量 (RAM) / 虚拟内存 (SWAP)</strong></li>
                          <li><strong>资产总值 (Asset)</strong></li>
                          <li><strong>节点在线 (Nodes)</strong></li>
                        </ul>
                      </div>
                      <div className="rounded-xl bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] p-3 border border-(--hairline) space-y-2">
                        <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                          可切换动/静态的微图：
                        </div>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                          <li><strong>硬盘用量 (Disk)</strong></li>
                          <li><strong>三网丢包 (Carrier Loss)</strong></li>
                          <li><strong>平均 CPU (CPU)</strong></li>
                          <li><strong>活跃连接 (Connections)</strong></li>
                          <li><strong>今日流量 (Traffic)</strong></li>
                        </ul>
                      </div>
                      <div className="rounded-xl bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] p-3 border border-(--hairline) space-y-2">
                        <div className="font-semibold text-(--text-primary) flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                          未对接真实数据的微图：
                        </div>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                          <li><strong>最近重启 (Uptime)</strong></li>
                          <li><strong>实时带宽 (Bandwidth)</strong></li>
                          <li><strong>计算核心 (Cores)</strong></li>
                          <li><strong>活跃进程 (Process)</strong></li>
                        </ul>
                      </div>
                    </div>
      ),
    },
  ], []);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faqItems.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      const inTitle = item.q.toLowerCase().includes(q);
      const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return inTitle || inKeywords;
    });
  }, [faqItems, activeCategory, searchQuery]);

  const MAX_DEFAULT_FAQ_COUNT = 5;
  const isSearchActive = Boolean(searchQuery.trim());
  const hasMoreFaqs = !isSearchActive && filteredFaqs.length > MAX_DEFAULT_FAQ_COUNT;
  const visibleFaqs = hasMoreFaqs && !showAllFaqs
    ? filteredFaqs.slice(0, MAX_DEFAULT_FAQ_COUNT)
    : filteredFaqs;

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* 面板 1：常见问题速查 (FAQ) - 方案 A 交互升级 */}
      <InstancePanel
        kicker="帮助"
        title="常见问题速查 (FAQ)"
        aside={<HelpCircle size={16} />}
      >
        <div className="flex flex-col gap-3">
          {/* 1. 搜索过滤栏与计数 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            {/* 搜索输入框 */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted) pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 FAQ，如：三网丢包、汇率、微图、大盘..."
                className="w-full h-8 pl-8.5 pr-8 rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-(--accent-500)/60 focus:ring-1 focus:ring-(--accent-500)/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-primary) p-0.5 rounded cursor-pointer"
                  title="清空搜索"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 条目统计 */}
            <div className="text-[11px] text-(--text-muted) shrink-0 flex items-center gap-1.5 px-1 sm:px-0">
              <span>共匹配</span>
              <span className="font-mono font-bold text-(--text-primary)">
                {filteredFaqs.length}
              </span>
              <span>/ {faqItems.length} 条</span>
            </div>
          </div>

          {/* 2. 分类过滤胶囊 Tag 栏 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FAQ_CATEGORIES.map(({ id, label }) => {
              const active = activeCategory === id;
              const count = id === "all" ? faqItems.length : faqItems.filter((f) => f.category === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(id);
                    setExpandedFaqId(null);
                    setShowAllFaqs(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                    active
                      ? "bg-(--accent-500) text-white shadow-xs font-semibold"
                      : "bg-[color-mix(in_srgb,var(--bg-card)_60%,transparent)] border border-(--hairline) text-(--text-muted) hover:text-(--text-primary) hover:border-(--accent-500)/30"
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] font-mono px-1 rounded-full ${
                    active ? "bg-white/25 text-white" : "bg-(--hairline) text-(--text-muted)"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. FAQ 列表（支持单开互斥手风琴） */}
          <div className="space-y-2 mt-1">
            {filteredFaqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_30%,transparent)]">
                <HelpCircle size={24} className="text-(--text-muted) opacity-40 mb-2" />
                <p className="text-xs font-medium text-(--text-secondary)">没有找到匹配的常见问题</p>
                <p className="text-[11px] text-(--text-muted) mt-1">请尝试更换搜索关键词或切换分类</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-3 text-xs text-(--accent-500) hover:underline font-medium cursor-pointer"
                >
                  重置筛选条件
                </button>
              </div>
            ) : (
              visibleFaqs.map((item) => {
                const isExpanded = expandedFaqId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] transition-all shadow-xs ${
                      isExpanded ? "ring-1 ring-(--accent-500)/30 bg-[color-mix(in_srgb,var(--bg-card)_75%,transparent)]" : "hover:border-(--accent-500)/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(item.id)}
                      className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left cursor-pointer select-none"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-(--hairline) bg-(--bg-card) text-(--text-muted) shrink-0">
                          {item.categoryLabel}
                        </span>
                        <span className="font-medium text-xs text-(--text-primary) leading-snug">
                          {item.q}
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-(--text-muted) transition-transform duration-200 shrink-0 ${
                          isExpanded ? "rotate-180 text-(--accent-500)" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0 text-xs text-(--text-secondary) leading-relaxed animate-fade-in">
                        {item.renderAnswer()}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* 4. 超过 5 条时的平滑折叠展开控制按钮 */}
            {hasMoreFaqs && (
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllFaqs((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_70%,transparent)] text-(--text-secondary) hover:text-(--accent-500) hover:border-(--accent-500)/40 hover:bg-[color-mix(in_srgb,var(--bg-card)_90%,transparent)] shadow-xs transition-all cursor-pointer group"
                >
                  <span>
                    {showAllFaqs ? "收起部分常见问题" : "查看更多常见问题"}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-(--text-muted) group-hover:text-(--accent-500) transition-transform duration-200 ${
                      showAllFaqs ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </InstancePanel>

      {/* 面板 2：三大项目反馈通道 */}
              <InstancePanel
                kicker="反馈"
                title="项目反馈与代码仓库"
                aside={<MessageSquare size={16} />}
              >
                <div className="space-y-4">
                  <p className="text-xs text-(--text-muted) leading-relaxed">
                    SAO 主题目前适配了三大探针。为确保您的反馈能由对应仓库维护者快速跟进，请优先在当前使用的项目仓库中提交 Issue。
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {PROJECT_REPOS.map((proj) => (
                      <div
                        key={proj.id}
                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all shadow-xs flex flex-col justify-between ${
                          proj.isCurrent
                            ? "border-(--accent-500)/40 bg-[color-mix(in_srgb,var(--accent-500)_4%,var(--bg-card))] ring-1 ring-(--accent-500)/20"
                            : "border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)]"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-(--hairline)">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs sm:text-sm font-semibold text-(--text-primary) truncate">
                                {proj.name}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--text-secondary) shrink-0">
                                {proj.tag}
                              </span>
                            </div>
                            {proj.isCurrent && (
                              hasUpdate ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0"
                                  title="检测到新版本发布，可前往下方对应仓库或首页底部查看更新"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  检测到更新
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-(--accent-500)/15 text-(--accent-500) border border-(--accent-500)/30 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-(--accent-500) animate-pulse" />
                                  当前运行
                                </span>
                              )
                            )}
                          </div>

                          <div className="text-[11px] font-mono text-(--text-muted) truncate">
                            {proj.repo}
                          </div>

                          <p className="text-xs text-(--text-secondary) leading-relaxed min-h-[2.5em] line-clamp-2">
                            {proj.desc}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-(--hairline)">
                          <a
                            href={proj.newIssueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`repo-action-btn ${proj.isCurrent ? "is-primary" : "is-secondary"}`}
                          >
                            <span>提交反馈</span>
                            <ExternalLink size={12} strokeWidth={2.2} />
                          </a>

                          <a
                            href={proj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="repo-action-btn is-secondary"
                          >
                            <Github size={12} />
                            <span>GitHub</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 3：反馈范围与提单指引 */}
              <InstancePanel
                kicker="指引"
                title="反馈范围与提单指引"
                aside={<AlertCircle size={16} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary) pb-2.5 mb-3 border-b border-(--hairline)">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>建议在本仓库反馈的问题</span>
                    </div>
                    <ul className="text-xs text-(--text-secondary) space-y-2 leading-relaxed list-disc list-inside">
                      <li>首页与内页的功能BUG反馈</li>
                      <li>具有普适性的主题功能需求建议</li>
                      <li>设计呈现与色彩方案建议与异常反馈</li>
                      <li>手机端、平板等不同分辨率下的响应式排版优化建议</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary) pb-2.5 mb-3 border-b border-(--hairline)">
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                      <span>建议前往原探针系统反馈的问题</span>
                    </div>
                    <ul className="text-xs text-(--text-secondary) space-y-2 leading-relaxed list-disc list-inside">
                      <li>探针客户端（Agent）掉线、离线重连或节点在线状态误报</li>
                      <li>探针底层系统指标采集不准（如 CPU/内存/磁盘占用率异常）</li>
                      <li>服务端 Docker 容器部署、反向代理或 WebSocket 连接中断</li>
                      <li>原系统基础权限管理与后端数据库存储错误</li>
                    </ul>
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 4：关于与致谢 */}
              <InstancePanel
                kicker="关于"
                title="关于 SAO 主题"
                aside={<Sparkles size={16} />}
              >
                <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-(--text-primary)">
                        Monitor SAO Theme
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                        {currentVersion}
                      </span>
                    </div>
                    <p className="text-xs text-(--text-muted)">
                      服务于探针数据呈现本身的高自由度模块化主题
                    </p>
                  </div>
                  <a
                    href="https://github.com/WAOR/Monitor-SAO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-(--hairline) bg-(--bg-card) text-(--text-primary) hover:border-(--accent-500) hover:text-(--accent-500) shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span>在 GitHub 上 Star 支持</span>
                  </a>
                </div>
              </InstancePanel>
    </>
  );
}
