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
