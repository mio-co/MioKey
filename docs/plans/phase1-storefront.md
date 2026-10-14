# Phase 1 实施计划：前台重做 + 品牌清理

目标：完成前台全部页面换新外观并清除 CFFK 品牌，不触碰锁定区域。
架构：所有前台页包在 `StoreShell`（或登录类页面用 `AuthShell`）里，shadcn 组件通过 `.mk-store` 作用域统一圆角/字重，支付相关页面只换模板。

## Brainstorm（自行决策，用户在睡觉）
- 视觉方向三选一：A 照搬 Rawjoy 中性黑白 + 胶囊（brief 指定）；B ui-ux-pro-max design-system 推荐的电商绿 + 橙 CTA、Rubik/Nunito Sans；C 自定义深色科技风。选 A：brief 已定参考站和字体，B 是通用模板答案，与店主现有 Shopify 店不一致；C 与参考不符。保留 B 检查单里的可访问性/触控/动效条目。
- 商品页布局：A 左图右表单（sticky 图）+ 下方详情/须知两栏；B 单列表单抽屉。选 A，桌面信息密度好，手机端加底部购买栏补足 CTA。
- 规格选择：胶囊按钮组（aria-pressed）而非下拉，规格通常 ≤6 个，一眼可比价。
- 动效克制（frontend-design）：只保留首页 hero 入场一次 + 用户触发的动效（抽屉、悬停 zoom、规格切换），去掉商品卡逐个 reveal。
- 大写 eyebrow 被列为生成式页面特征：去掉 uppercase/字距，中文本来无影响。

## Tasks
1. [x] 清理剩余品牌：AdminSidebar 名称/Logo alt/关于/GitHub 链接/更新检查 → mio-co/MioKey；better-auth 应用名与 2FA issuer、推送默认站点名、示例配置、设计文档。
2. [x] 新增 AuthShell；login/signup/forgot/reset/two-factor 套用（脚本只换 import，login 加纯展示用 loginSteps）。
3. [x] checkout / order / payment-result / account / account/order 改用 StoreShell（模板 only）。
4. [x] 商品页：面包屑、sticky 主图、价格与库存、规格胶囊、数量步进器、支付方式单选卡、优惠与备注折叠、手机底部购买栏（`form="mk-buy"` 提交同一表单）。
5. [x] 自检修正：头部“订单查询”重复；focus-visible 全局样式；cursor-pointer；底部栏遮挡焦点（scroll-padding）；eyebrow 去大写；首页去掉逐卡 reveal；提交按钮去尾箭头。
6. [x] 验证：typecheck（对比基线）、lint、tests、build、Playwright（桌面 + iPhone 12，DOM 断言 + 少量截图）。
7. [x] 写 rework-log，分步提交，push origin main。

## Review Focus
- `git diff upstream/main --stat -- server database lib` 只能有字符串/品牌改动。
- 支付相关页面 `<script>` 与改动前一致（diff 只出现 import 行）。
