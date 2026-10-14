# MioKey 重做日志

## Phase 1 — 前台重做 + 品牌清理（2026-10-14）

起点：dc22a05（上一轮 WIP：字体、token、StoreShell/StoreHeader/StoreDrawer、ProductCard/Carousel、首页）。本轮在其基础上继续，没有重来。规格与计划见 docs/miokey-spec.md、docs/PRD.md、docs/plans/phase1-storefront.md。

### 变更
- 品牌：AdminSidebar 名称/Logo alt/“关于”/GitHub 链接 → mio-co/MioKey，更新检查改读 `raw.githubusercontent.com/mio-co/MioKey/main/package.json`；better-auth appName 与 2FA issuer、推送默认站点名、示例邮件发件人、脚本输出、feat/ 设计文档、perpay 注释 → MioKey。
- 新增 `components/storefront/AuthShell.vue`；login / signup / forgot-password / reset-password / two-factor 使用它（登录页左侧深色品牌面板 + 三步流程）。
- checkout / order / payment-result / account / account/order 改用 StoreShell（只改模板，script 仅 import 变化）。
- 商品页重排：面包屑、sticky 主图、价格 + 库存状态、规格胶囊（aria-pressed）、数量步进器、支付方式单选卡、“优惠与备注”折叠、手机底部固定购买栏（`form="mk-buy"` 提交同一表单）。script 仅 import 变化。
- tailwind.css：`.mk-store` 下 shadcn 卡片/标题/按钮/提示的 components 层样式；`.mk-auth`；数量输入去 spinner；全局 focus-visible 轮廓、cursor-pointer；手机购买栏存在时 `scroll-padding-bottom`；eyebrow 去大写；success/warning 在浅色模式加深以达到小字对比度。
- 去掉 PublicNav 中与头部导航重复的“订单查询/我的订单”链接；首页去掉逐卡/逐项 reveal 动画（只保留 hero 入场）；页脚手机端两列。

### 问题与决策
- `.mk-card-media { position: relative }` 是未分层 CSS，覆盖了 `lg:sticky` 并让 `top-24` 变成相对偏移（主图下移 96px）。改为外层 sticky、内层 media。
- 视觉方向：ui-ux-pro-max `--design-system` 给出电商绿/橙 + Rubik/Nunito Sans。brief 已指定 Rawjoy 参考与 Archivo/Poppins，按 brief 执行，只采用其检查单（对比度、焦点、触控 44px、reduced-motion、无横向滚动）。frontend-design 的提醒落实为：动效收敛、去掉多余 eyebrow 标签和按钮尾部箭头。
- 保留的 `cffk` 内部标识（不属于用户可见品牌，改了会断已部署站点）：`x-cffk-admin-login`、`x-cffk-admin-create-user` 请求头，localStorage `cffk-local-orders`/`cffk-local-addresses`，PerPay 幂等键 `cffk:`、供应商请求号 `cffk-`，媒体探针 `.__cffk_probe`，D1 名 `cffk_db`，测试里的示例回调域名。
- 本地演示库 siteName 从 “CFFK-Shop” 改成 “MioKey Demo”（只改 .wrangler 本地数据，不提交）。
- 环境：容器中途重启过，/usr/bin/chromium 消失，用 `sudo apt-get install chromium fonts-noto-cjk` 恢复（Playwright CDN 不提供 arm64 包）。vue-tsc 与仓库的 TS 6 不兼容，在 miokey-qa/tsc 用 vue-tsc 3 + TS 5.9 检查并和基线比对。

### 测试
- typecheck：39 条，与基线完全一致（全部是上游已有问题或 `?url`/`bun:*` 类型环境问题），无新增。
- lint：`eslint .` 0 error 0 warning。tests：98 pass / 0 fail。
- Playwright（miokey-qa/p1_check.py，桌面 1440 + iPhone 12）：10 个前台路径 ×2 全部 200、无控制台错误、无横向溢出、页面无 “CFFK”；规格切换、数量 +1、手机购买栏、手机菜单（打开 → 点击链接后关闭；返回键关闭）、头部搜索、暗色模式全部通过。
- build：`vike build` 成功（client + ssr，1m42s）；`bun run build` 的 drizzle-kit generate 步骤无新迁移。

## Phase 2 — 后台重做（2026-10-14）

起点：6283f12。计划见 docs/plans/phase2-admin.md（含方案比较与取舍）。

### 变更
- `AdminSidebar.vue` 重写（MioCore AppSidebar + mail admin-sidebar 逻辑的 Vue 版）：数据驱动的“运营 / 设置”两组；链接带 `aria-current`；折叠分组记住展开状态（localStorage `mk-admin-nav`），当前页所在分组总是展开、收起时显示小圆点；图标折叠态下分组改为右侧弹出菜单、单项显示 tooltip；`SidebarRail`。手机端：复用 `lib/ui/drawer-history`——点菜单项先关抽屉再 `navigate`（覆盖抽屉那条历史），系统返回键只关抽屉；再加 `urlPathname` 监听兜底。底部用户菜单增加主题切换、查看店铺。检查更新、退出登录逻辑原样保留。
- `+Layout.vue`：毛玻璃吸顶页头（手机面包屑只显示末级）、⌘/Ctrl+K 跳转按钮、主题切换、查看店铺；`main` 按路径做 0.32s fade-up 页面过渡；返回顶部按钮；挂载 `AdminCommandMenu` 和 `AdminConfirmHost`。站点时区 provide 逻辑不变。
- 新增 `AdminCommandMenu.vue`：⌘/Ctrl+K 打开，↑↓/Enter，支持拼音全拼与首字母（pinyin-pro 按需动态加载），也能切主题、开店铺；`/` 聚焦当前页搜索框。
- 新增 `lib/ui/admin-confirm.ts` + `AdminConfirmHost.vue`（Promise 式 AlertDialog）；suppliers/accounts 的 `window.confirm` 换成它（同样的判断与调用，只是换了确认框）。
- 移植 MioCore `components/ui/alert-dialog`、`context-menu`。
- `AdminDataTable`：`loading` 首次加载骨架行、重新加载顶部进度条；手机端默认“卡片化”（纯 CSS，`td[data-label]` 标签：值，插槽只渲染一次）；桌面右键行弹出同一 actions 插槽的上下文菜单；空状态图标；表头/行距/圆角统一。13 个使用页只加了 `:loading="loading"`。
- `AdminPageHeader`、`PaymentSettingsLayout`、`MailSettingsLayout`、push/templates 标题改 Poppins 展示字体；设置子导航改为胶囊（手机横向滚动、桌面竖排 sticky）。支付相关文件只改模板 class。
- 后台登录页套用 AuthShell（只改模板，左侧文案换成后台说明）。
- 仪表盘：图表配色从蓝/橙改为中性灰 + MioKey 珊瑚色，指标数字用展示字体；ChartContainer 传固定 id。
- tailwind.css：全局为 dialog / alert-dialog / sheet / 下拉 / 右键菜单 / popover / select 补上进出场动画（原 shadcn 类名依赖未安装的 tw-animate，之前是瞬间出现/消失），遮罩改为 42% + 轻模糊，折叠内容高度动画，全部尊重 reduced-motion；`.mk-admin` 作用域（圆角 0.875rem、卡片/徽章/提示/对话框样式、手机 44px 输入与按钮、触屏下开关/复选框/单选扩大到 44px 点击区）；侧栏选中项黑底白字、子项加粗+浅底；toast 圆角与字体。
- `SheetContent` 加 `data-side`（用于方向动画）；`SidebarProvider` 的 `useMediaQuery` 加 `ssrWidth: 1024`。

### 问题与决策
- 手机访问所有后台页都有 “Hydration completed but contains mismatches”：上游 SidebarProvider 的 `useMediaQuery` 在客户端首帧就返回手机值，服务端渲染的是桌面侧栏。加 `ssrWidth` 后首帧与服务端一致、挂载后再切换，错误消失。
- 仪表盘桌面端也有 hydration 报错：ChartContainer 用 reka `useId` 生成的 id 在 SSR/客户端不一致（改动前就存在，已用旧版 Layout/Sidebar 复现）。传固定 `id="dashboard-trend"` 解决。
- reka `ContextMenuTrigger as-child` 会把行的 `data-slot` 改成 `context-menu-trigger`，手机卡片样式因此改用 `tbody > tr` 选择器。
- Tailwind v4 的 `translate-*` 用的是独立 `translate` 属性，弹窗动画关键帧只用 `transform` 做位移/缩放，避免与居中位移叠加。
- 内部 `cffk` 标识保持不变（已定决策）：`x-cffk-*` 请求头、`cffk-local-*` 存储键、`cffk:` / `cffk-` 前缀、`.__cffk_probe`、`cffk_db`——为兼容已部署站点与上游同步，用户不可见。
- 不做的：没有给已有的各页确认 Dialog 换成 confirmAction（那会改页面脚本），只统一了样式与动画；行内按钮与右键菜单共用插槽，不另造菜单项数据。


## Cycle 1 — 评估 → 学习 → 修改 → 测试（2026-10-14，提交 eb69d69）

（本节根据 cycle-1 代理的报告补写；该代理在写日志前用完了迭代次数。）

### Findings (ranked)
1. Admin delivery dialog ignored order type (auto orders showed confirm/mark-failed; manual showed retry auto); empty content could be confirmed; Esc disabled.
2. Mobile product page: sticky buy bar and in-page buy button visible together.
3. Buyer order query: delivery contents one <pre>, no copy button.
4. Order page copy too technical ("OTP", "原子覆盖本机分组").
5. Manual-delivery products said "付款后自动发货".
6. a11y (axe): logo aria-label mismatch; carousel <a role=group> invalid; email/coupon inputs unlabeled; login/signup no h1; two <main> in admin; admin filter Select unnamed; "Close"/"Toggle Sidebar" English; no skip link; mobile touch targets 32–40px; login step number contrast 3.81.
7. Admin order detail card header blank band.
8. SEO (SEOmator product page 88/B): <head> boot script empty under SSR (v-html on dynamic component) → dark-mode flash, reveal broken; duplicate og:title/description; no Product JSON-LD; no robots.txt; main image missing width/height; signup page lost site settings (title "MioKey"); admin tab titles identical.

### Changes (frontend only; payment page scripts unchanged except component imports)
- components/storefront/DeliveryContents.vue (per-item copy + copy all, aria-live); plain-language order copy; heading order; CardTitle `as` prop.
- StickyBuyBar.vue hides when in-page buy button visible; labelled inputs; "付款后人工发货" i18n key; image width/height; larger breadcrumb targets.
- Storefront shell: skip link, focusable main, logo named by visible text, carousel structure fixed, 44px header/footer targets, auth card titles h1, step contrast raised.
- SEO: +Head.vue uses :innerHTML (boot script restored); dedup og tags; Product + BreadcrumbList JSON-LD; public/robots.txt; signup onBeforeRender passes site settings.
- Admin: delivery dialog shows only valid actions per order type, confirm/mark-failed disabled when empty; SidebarInset main→div, single main + skip link; pages/@adminPath/+title.ts ("页面 · 后台 · 店名"); Select aria-labels; Chinese UI strings; 44px mobile header/popover buttons; card header gap fixed.
- scripts/dev-seed-orders.sql: 7 local demo orders (pending, manual pending, delivered card/fixed, closed, delivery failed, auto incomplete). No schema change.

### Tests
typecheck 39 (= baseline); eslint 0/0; unit 98/0; vike build OK; p1 20 paths 200, no console errors/overflow; p2 desktop 32 + mobile 38 pass; new miokey-qa/regress.py 4 groups 0 FAIL. axe re-run only desktop storefront (remaining moderate landmark-unique, region; product-page red notice contrast disappeared only because local EPAY enabled). SEOmator not re-run.
server/database diff vs upstream: unchanged, branding strings only (6 files +24/−24).

### Deferred
- Empty form submit: toast only, no focus/aria-invalid (product page is payment-related; script change needs care).
- Short product descriptions; no sitemap (server route); security headers (server).
- axe region / landmark-unique (promo bar, header nav naming).
- Admin small targets: push settings ~20, Telegram 6.
- zh-TW new strings auto-converted, not reviewed.
- amaeru.com ideas not implemented: header search with popular terms + recommended products, "From" price, promo bar.

### Local env (not committed)
Demo orders in local D1; local EPAY enabled with fake gateway pay.example.com (buyer flow redirects to dead gateway — expected). chromium + fonts-noto-cjk reinstalled; axe-core and seomator installed under miokey-qa.


## Cycle 2 — 评估 → 学习 → 修改 → 测试（2026-10-14，提交 c073e1f）

（本节由 Cycle 3 代理补写：Cycle 2 代理在提交推送后、写日志和报告测试前崩溃。变更内容取自提交本身，测试结果为 Cycle 3 开始时在 c073e1f 上重新跑出的。）

### Findings（来自 Cycle 1 遗留 + axe/SEOmator 复查）
1. axe `region` / `landmark-unique`：公告条、侧栏不在地标内；多个 `<nav>` 同名。
2. 表单空提交只有 toast，没有焦点/aria-invalid（登录、注册、找回/重置密码、两步验证、账户页）。
3. SEO：无 sitemap；首页缺 WebSite JSON-LD 和 og:image；商品 JSON-LD Offer 没有 price；各页标题格式不一。
4. zh-TW 新字串是机器转换，用语不地道。
5. 后台：推送等设置页小触控目标；表格首屏 SSR 出现空状态闪烁。

### Changes
- 地标：公告条 `<aside aria-label>`；后台 Sidebar 包进命名 `<nav>`；PublicNav/StoreHeader 各导航 `aria-label` 唯一。
- 新增 `lib/ui/focus-invalid.ts`：提交失败时聚焦第一个无效字段并设 `aria-invalid`；接入 login / signup / forgot / reset / two-factor / account（非支付页）。
- SEO：`server/seo/sitemap.ts`（只读查询已上架商品生成 sitemap.xml）+ `server/hono.ts` 两行注册——经批准的只增路由，不动现有路由/契约；`+Head.vue` 首页 WebSite JSON-LD、绝对地址 og:image；商品 Offer 带 `price`/`priceCurrency`；`lib/seo/page-title.ts` 统一“页面 · 店名”。
- zh-TW 用语校订（9 处）；CardTitle 小调；Pagination 中文标签。
- 后台：AdminDataTable SSR 首屏骨架（不再闪空状态）；dash/push/wecom/security 触控尺寸。
- 测试：`tests/core/seo-sitemap-title.test.ts`；regress.py 增加 c2-* 断言（登录聚焦、标题、sitemap、首页 SEO、导航命名唯一、Offer 价格、后台侧栏地标、表格骨架）。

### Tests（在 c073e1f 上，Cycle 3 开始时）
- typecheck（miokey-qa/tsc，vue-tsc）39 = 基线，无新增；eslint 0 错误 0 警告；unit 100 pass / 0 fail（14 文件）；vike build 成功（约 2 分钟）。
- p1_check：20 路径 200，无 console 错误、无横向溢出（30 条记录）。p2_check：桌面 32 / 手机 38 全部通过。
- regress.py：桌面前台 16、桌面后台 7、手机前台 18、手机后台 8，0 FAIL。
- axe：手机前台 7 页 0 违规；后台（桌面+手机各 16 页）只剩 `heading-order`（moderate，6 页：CardTitle 默认 h3 跳过 h2）。
- SEOmator 商品页：90 / A（Cycle 1 为 88 / B）。剩余多为部署层（HTTPS、安全头、压缩、HTTP/2），可前端处理的：LCP 图无 fetchpriority、robots.txt 未引用 sitemap、meta description 偏短（数据内容）。
- 环境注：沙箱重置后 chromium / fonts-noto-cjk 需重装（apt）；`bunx` 不在 PATH，用 `bun x`；build 超过 120s，需后台运行。


## Cycle 3 — 买家旅程打磨 + 后台订单处理（2026-10-14，提交 a2e9ac5、116d323、12b89fa）

计划与方案比较：docs/plans/cycle3.md。参考：amaeru.com 首页（顶部促销条、搜索面板“热门搜索 + 推荐商品”、多规格卡片 “From $x”）。

### Findings（按价值排序）
1. 商品页数量改为 2 后，价格和手机吸底栏都还显示单价，没有合计。
2. 多规格商品卡只显示首个规格价（Spotify 首规格 ¥15 / 另一规格 ¥158），没有“起”价；按价格排序也只看首规格价。
3. 404/错误页是英文 “Page Not Found”，没有页头页脚和返回入口。
4. 商品页打开搜索没有推荐商品（只有首页传了商品）；搜不到时只有一句话，是死路。
5. 结算页错误态同时显示“正在确认订单信息...”和“无法继续支付”，且没有任何按钮；加载态只有一行字。
6. prefers-reduced-motion 下首页 hero 入场、页头位移、卡片图片缩放、轮播箭头仍在动。
7. 后台发货对话框看不到商品/数量/联系方式/金额，处理时要来回切详情；订单详情在手机上单列竖排、标题居中。
8. 后台仪表盘手机端 5 张指标卡单列（每张 134px），趋势图被推到很靠下。
9. 后台 axe `heading-order`（6 页）：卡片标题 h3 紧跟页面 h1。
10. 登录/注册/账户订单页的语言、主题按钮 36px；主题按钮名叫“黑暗/白天”。

### Changes
- 商品页：表单提交按钮上方加“合计 · ¥单价 × 数量 ¥总价”（`data-testid=buy-summary`，aria-live）；手机吸底栏显示“规格 × 数量”和合计。仅展示：前端 `单价分 × 数量`，有优惠预览时直接用服务端返回的 finalAmount；下单金额仍由服务端计算，提交逻辑未动（脚本只新增两个展示用 computed 和一个 formatCentsAsYuan 导入）。
- “¥x 起”：`pages/index/+data.server.ts` 在 `getPublicCatalog` 结果上加一个只读查询（ACTIVE 规格的最小价与数量），给商品加 `minPrice`/`skuCount`；ProductCard、首页轮播、搜索面板在多规格时显示“¥x 起 / From ¥x”；价格排序用最低价。`server/` 无改动。
- 搜索面板：商品页 data 复用 `getPublicCatalog` 传入推荐商品与分类（排除当前商品）；匹配范围加上分类名；无结果时显示提示并继续展示推荐商品；结果标题显示“找到 N 件相关商品”。
- `pages/_error/+Page.vue`：StoreShell 包裹，三语文案，404 给“返回首页 / 查询订单”，500 给“返回首页 / 重新加载”；`throw render(code, reason)` 带的原因原样显示。
- 结算页（支付页，只改模板）：错误时描述改为“没有找到可以继续支付的订单。”并给“返回首页 / 查询订单”；加载态改为骨架。
- 动效：`.mk-store` 范围内在 reduced-motion 下动画 1ms、不过渡 transform（保留颜色/透明度反馈）；两处 JS 平滑滚动在 reduced-motion 时改为瞬间。
- 后台订单：发货对话框顶部加订单摘要（商品 × 数量、联系方式、金额、订单号，`data-testid=delivery-summary`，只改模板）；详情对话框与发货对话框标题左对齐，订单信息在手机上两列。
- 后台仪表盘：手机两列指标卡，金额卡占整行，五张卡都在首屏内、图表上移；数字 24px（桌面 28px）。
- CardTitle 默认标签可由布局注入（`mk-card-title-tag`），后台布局注入 h2 → 后台 axe 0 违规；前台仍为 h3。
- StorefrontPreferences 按钮 44px；zh-CN 主题文案“浅色/深色”。

### 决策
- 促销条：现有站点公告条已经承担这个位置（后台可配置文案，长文自动跑马灯）。amaeru 的 “Shop Now” 按钮需要新的设置项（链接/按钮文字）→ 涉及设置结构，不做；记为待定。
- 热门搜索词：用“热门分类”标签代替 amaeru 的固定热门词（没有搜索统计数据，硬编码词不可维护）。
- 不加购物车：单商品直购是现有订单模型，加购物车属于方向级变化。

### Tests（最终状态）
- typecheck 39 = 基线（无新增）；eslint 0/0；unit 100 pass / 0 fail；vike build 成功。
- p1_check 20 路径 200、无 console 错误与横向溢出；p2_check 桌面 32 / 手机 38 全通过。
- regress.py 新增 c3-*：from-price、buy-total、search-fallback、404-page、checkout-error、reduced-motion、auth-pref-44（前台），dash-layout、delivery-summary（后台）。结果：手机前台 25、桌面前台 22（auth-pref 加入前）、手机后台 10、桌面后台 9，全部 0 FAIL。
- axe：手机前台 7 页 0 违规；桌面后台 16 页 0 违规（Cycle 2 剩余的 heading-order 已清零）。
- SEOmator 商品页 90 / A（与 Cycle 2 持平）。
- miokey-qa 新增：c3_eval.py（买家旅程探针）、c3_admin.py（仪表盘/详情/发货对话框探针）、tsc.sh（vue-tsc 对比基线）、axesum.py。

### Deferred
- 后台手机小触控目标（探针仍报）：推送配置表格复选框 16px（触屏 ::after 扩展可能未被探针识别，需确认）、系统设置时区组合框 “Show popup” 英文名与 16px 按钮、设置子导航胶囊 36px、Telegram/企业微信按钮 40px。
- robots.txt 引用 sitemap（静态文件不知道站点域名，需服务端生成）；LCP/安全头/压缩属部署层。
- 公告条 CTA（需新设置项）。
- 首页卡片库存文字仍按首规格库存。
