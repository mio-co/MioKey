# Phase 2 实施计划：后台重做

目标：后台交互对齐 MioCore / mail（手机侧栏点完即收、折叠分组、快捷键、确认框、表格手机可用、骨架加载、页面过渡），视觉沿用第一阶段 MioKey 语言（token、Archivo/Poppins、`--ease-out-expo`），不触碰任何锁定逻辑。
架构：只改 `pages/@adminPath/+Layout.vue`、`components/AdminSidebar.vue`、`components/admin/*` 的模板与展示逻辑，新增几个纯展示组件和 `lib/ui/*` 组合式函数；页面里只加模板属性（`:loading`、`data-label` 由表格组件生成），业务 `<script>` 不动（唯一例外：suppliers/accounts 的 `window.confirm` 换成同语义的 `await confirm()`）。

## Brainstorm（用户在睡觉，自行决策）
- 手机侧栏收起：A 每个链接 `@click` 调 `setOpenMobile(false)`；B 监听 `urlPathname` 变化后关闭；C 复用第一阶段 `lib/ui/drawer-history`（mail 的做法：打开压历史、返回键关抽屉、点链接先关抽屉再 `navigate` 并覆盖那条历史）。选 C + B 兜底：返回键行为与前台一致，且任何途径（命令面板、页面内链接）导航后都会关闭。
- 折叠分组：A 全部默认展开（现状）；B 只展开当前分组（MioCore 的思路）；C 记住用户展开状态并自动展开当前分组。选 C：分组多（4 组 18 项），全开在手机上要滚很久；记忆状态存 localStorage `mk-admin-nav`。图标折叠态下分组改为右侧弹出菜单（shadcn nav-main 模式），否则折叠态点分组没有反应。
- 表格手机端：A 保持横向滚动；B 复制一份卡片视图（插槽渲染两次，重复 id / 双倍 DOM）；C 纯 CSS 把行变成“标签：值”卡片（`td[data-label]::before`）。选 C：插槽只渲染一次，所有页面自动受益；保留 `mobile="scroll"` 逃生口给列多且需要对齐的表。
- 行操作：桌面端右键行弹出上下文菜单，复用同一个 `actions` 插槽（MioCore context-menu 组件移植），手机端禁用（避免长按与滚动冲突）。
- 确认框：A 每页各写 Dialog（现状，部分页面用 `window.confirm`）；B 全局 `useAdminConfirm()` Promise 式 AlertDialog。选 B 作为基础设施，只替换原本用 `window.confirm` 的地方，已有的确认 Dialog 只统一样式（不改脚本）。
- 快捷键：⌘/Ctrl+K 打开命令面板（跳转任意后台页面、切换主题、打开店铺），⌘/Ctrl+B 折叠侧栏（已有），`/` 聚焦当前页搜索框，`?` 打开快捷键说明（命令面板底部列出）。不引入 cmdk 依赖，用 Dialog + 列表自己实现上下键/回车。
- Toast：沿用根布局 vue-sonner，后台作用域内统一圆角/字体；位置手机端 top-center、桌面 top-right（MioCore 用 top-center，桌面右上不挡页头操作）。
- 页面过渡：Vike 客户端路由切页时 `main` 以 path 为 key 做 220ms fade-up（`--ease-out-expo`），尊重 reduced-motion；顶部细进度条在 `isTransitioning` 期间显示（vike-vue 提供 `pageContext.isTransitioning`？不确定就用 onPageTransitionStart/End 钩子——不新增钩子，改为 CSS 动画即可，避免改 Vike 配置）。
- 视觉：后台作用域 `.mk-admin`：`--radius: 0.875rem`（比前台的胶囊克制，表单密度更高）、标题 Poppins、侧栏 inset 变体、卡片无阴影细边、选中项黑底白字（前台主色），暗色模式完整对应。ui-ux-pro-max 检查单：触控 ≥ 44px（手机）、焦点可见、对比度、reduced-motion、无横向滚动。

## Tasks
1. [ ] 移植 MioCore `components/ui/alert-dialog`、`context-menu`；新增 `lib/ui/admin-confirm.ts` + `components/admin/AdminConfirmHost.vue`。
2. [ ] AdminSidebar 重写：数据驱动分组、记忆折叠、aria-current、tooltip、折叠态弹出菜单、手机点击即收 + 返回键关闭 + 路由变化兜底、底部用户菜单（账户/主题/店铺/退出）。
3. [ ] +Layout：页头（触发器、面包屑手机只显示末级、⌘K 搜索按钮、主题切换、查看店铺）、页面过渡、返回顶部、确认框宿主、命令面板 `AdminCommandMenu.vue`、`/` 聚焦搜索。
4. [ ] AdminPageHeader、AdminDataTable（骨架、手机卡片、右键菜单、空状态、吸顶表头）；各页面加 `:loading`。
5. [ ] `.mk-admin` 样式层：卡片、表单、对话框、徽章、toast、仪表盘指标卡；登录页套用 AuthShell 风格（只改模板）。
6. [ ] 支付后台页（system/payments、payment-logs、PaymentSettingsLayout、PaymentUrlFields、JsonFormFields）只改模板/样式，`git diff` 核对 script 不变。
7. [ ] 验证：typecheck（对比基线 39）、eslint、tests、build、Playwright（每个后台页面 ×桌面 1440/iPhone 12：无控制台错误、无横向滚动、手机侧栏点击后关闭、对话框开关、手机表格可用）。
8. [ ] 写 rework-log，分步提交并 push origin main。

## Review Focus
- `git diff upstream/main --stat -- server database lib`：lib 只新增 `lib/ui/*` 展示代码，server/database 只有第一阶段的品牌字符串。
- 支付后台页 `<script>` 与 6283f12 一致。
