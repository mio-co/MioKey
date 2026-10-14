# Cycle 5 计划（最终轮）— 首屏性能 / 前台拆包 / 整体复查 / 文档与收尾

## 评估角度
- 性能：沿用 c4_perf.py（生产预览 + iPhone 12 + 4× CPU + 1.6 Mbps/150ms），改前改后对比 FCP/LCP/JS 字节。
- 整体复查：完整买家旅程（首页 → 商品 → 规格 → 数量 → 结算到支付步骤 → 订单查询 → 结果页）和全部后台页面，桌面 1440 + iPhone 12，浅/深色，zh-CN/zh-TW/en-US，用 ui-ux-pro-max 清单 + regress/p1/p2/axe 探针。
- SEOmator：首页 + 商品页终审。
- 文档：README / docs 与当前实现一致，无用户可见 “CFFK”。

## 方案比较（自行头脑风暴后选定）
1. 首屏 LCP 图片：
   - A. 保留动画、只加 preload —— LCP 仍要等 opacity 动画结束，收益有限。
   - B. ✅ 首屏主图（商品页主图、首页轮播第一张所在容器）去掉淡入，保持 fetchpriority=high + eager + decoding=sync(首张)；在 +Head 为商品页封面 / 首页首个精选封面输出 `<link rel=preload as=image fetchpriority=high>`。文字仍保留 fade-up（不影响图片 LCP）。
2. JS 拆包：
   - A. 手写 manualChunks —— 与 vike 自身分包冲突风险高、难维护，否决。
   - B. ✅ 先看各页实际加载的 chunk，找“只在交互后才需要”的组件（例如首页排序 Select、商品页弹层/对话框、Reka 重组件），用 defineAsyncComponent / 条件挂载延迟加载；后台组件不应进入前台 chunk。测量后只保留确有收益的改动。
3. 文档：README 改为 MioKey 介绍 + “基于 34892002/cffk 修改” + Apache-2.0 + NOTICE；docs/dev.md 与 components.md 对齐当前结构。

## 范围外（HARD LOCK）
支付/订单状态逻辑、API、DB/迁移、better-auth 流程、发卡、cron、供应商同步不动；支付页只改模板/样式。
