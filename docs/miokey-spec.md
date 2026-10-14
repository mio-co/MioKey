# Spec: MioKey 前台 + 后台 UI 重做

## Objective
在不改变业务行为的前提下，把 CFFK 分支重做为 MioKey：去除全部 CFFK 品牌；前台换成 Rawjoy（amaeru-web）风格的店铺体验；后台交互参照 MioCore / mail 重写（第二阶段）。用户是个人店主，访客多数在手机上下单数字商品。

## Tech Stack
Vike + Vue 3 SSR、Hono、Telefunc、Drizzle + D1、better-auth、shadcn-vue（Reka UI）、Tailwind v4、bun，部署在 Cloudflare Workers。

## Commands
- 开发：`node_modules/.bin/vike dev --host 127.0.0.1 --port 3000`
- 测试：`bun test tests/core`；Lint：`node_modules/.bin/eslint .`；构建：`bun run build`
- 类型检查：仓库 TS 6 与 vue-tsc 不兼容，用 /workspace/work/miokey-qa/tsc（vue-tsc 3 + TS 5.9 的包装 tsconfig），和 `miokey-qa/tsc-baseline.txt` 对比，只要求不新增错误（基线 39 条为上游已有/环境问题）。

## Project Structure（本次涉及）
- `components/storefront/`：StoreShell（公告条 + 吸顶头部 + 页脚）、StoreHeader（桌面导航、搜索抽屉、手机左侧菜单）、StoreDrawer、PublicNav、ProductCard、ProductCarousel、Reveal、AuthShell（登录类页面框架）。
- `pages/tailwind.css`：设计 token、字体、动效、`.mk-store` / `.mk-auth` 作用域。
- `lib/ui/`：drawer-history（抽屉与浏览器返回键联动，前台菜单与后台手机侧栏共用）、scroll-lock、scroll-direction、reveal、admin-confirm（Promise 式确认框）。
- 后台（第二阶段）：`pages/@adminPath/+Layout.vue`（页头、页面过渡、返回顶部、命令面板、确认框宿主）、`components/AdminSidebar.vue`、`components/admin/`（AdminDataTable 骨架/手机卡片/右键菜单、AdminPageHeader、AdminCommandMenu、AdminConfirmHost）、`.mk-admin` 样式作用域。

## Design tokens（已定）
- 字体：Archivo（正文）+ Poppins（标题），自托管 woff2；中文回退到系统字体（PingFang / 雅黑 / Noto）。
- 颜色：沿用中性 oklch 体系（前景近黑、背景白、muted 浅灰），唯一点缀色为库存紧张的珊瑚色 #fda084；成功/警告用语义 token。暗色模式整套对应。
- 形状：前台 `--radius: 1.25rem`，按钮/输入框为胶囊形，卡片 24px，图片卡 slow-zoom。
- 动效：主缓动 cubic-bezier(.16,1,.3,1)，抽屉 cubic-bezier(.7,0,.2,1)；尊重 prefers-reduced-motion。

## Boundaries（硬锁）
- 不改：支付（渠道、回调、签名、订单/支付状态、PaymentQrCode 逻辑）、DB schema 与迁移、better-auth 流程、API 路由与契约、发卡、cron、供应商同步、订单号格式。
- 支付相关页面（checkout、order、payment-result、account/order、商品页下单表单、后台支付设置）只改模板/样式，`<script>` 逻辑保持一致（只允许替换组件 import）。
- 内部协议标识保留 `cffk` 字样：`x-cffk-admin-login` / `x-cffk-admin-create-user` 请求头、localStorage 键 `cffk-local-orders` / `cffk-local-addresses`、PerPay 幂等键前缀、供应商请求号前缀、媒体探针路径、D1 数据库名 `cffk_db`。改它们会造成已部署站点的行为/数据断裂，不属于用户可见品牌。

## Success Criteria
- 用户可见的界面、文档、更新检查里没有 CFFK（README/NOTICE 的署名段除外）。
- 375 / 390 / 768 / 1440 宽度下没有横向滚动；所有前台页面使用同一套外壳；暗色模式正常。
- 后台：手机侧栏点击菜单项后关闭、返回键关闭抽屉；⌘/Ctrl+K 跳转；表格手机端可用；所有后台页无控制台错误。
- 触控目标 ≥ 44px，键盘焦点可见，图标按钮都有可访问名称，动效遵守 reduced-motion。
- typecheck 不新增错误，lint 0 error，tests 通过，build 成功。

## Open Questions
- 无需阻塞的问题。方向性问题写在最终报告里。
