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
