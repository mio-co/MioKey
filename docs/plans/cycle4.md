# Cycle 4 计划 — 性能 / 深色 / 键盘 / 异常内容 / 繁中与英文

## 评估角度（与 Cycle 1–3 不同）
- 性能：生产预览（vike preview）+ iPhone 12 + 4× CPU 降速 + 1.6 Mbps/150ms，测 FCP/LCP/CLS 与各类资源字节（miokey-qa/c4_perf.py）。
- 深色模式：每个前台与后台页面扫描“大块浅色背景”和“对比度不足文字”（canvas 转换 oklch → 计算真实对比度，c4_eval.py）。
- 键盘：商品页 Tab 顺序、焦点环、抽屉（搜索/菜单）焦点是否被困在面板内、Esc 与焦点归还；后台订单页 Tab 顺序与对话框。
- 异常内容：注入超长商品名（卡片与商品页 h1）、触屏模拟下后台小目标。
- 语言：zh-TW / en-US 下扫描简体残留与中文残留。

## 方案比较（自行头脑风暴后选定）
1. 订单查询 / 结算 / 支付结果页的多语言（这三页是支付相关页，脚本必须保持不变）：
   - A. 在页面 script 里引入 useStorefrontPreferences —— 违反“脚本逻辑不变”，否决。
   - B. 每段文字包一个 `<StoreText zh en>` 组件 —— 需要在脚本里加组件 import（以前允许过），但属性（placeholder、aria-label）没法用。
   - C. ✅ 在 `+onCreateApp` 注册全局模板函数 `$tr(中文)`：按当前语言查英文词典，繁体由现有 traditionalize 自动转换，查不到原样返回。页面只改模板，脚本零改动；属性也能用；脚本返回的状态文字也能在模板里包一层。
2. 性能：
   - Archivo 四个字重是完整字库（每个 52 KB）→ 用 fontTools 子集化到拉丁 + 常用标点（约 23 KB）并加 unicode-range；中文本来就回退系统字体。
   - better-auth 客户端随 PublicNav 进入每个前台页面 → 改为点击“退出登录”时动态 import（流程与调用完全一样，只是延迟加载）。
   - 首页网格前 4 张卡在有轮播时也 eager → 只在没有轮播时 eager。
3. 抽屉焦点：在 StoreDrawer 的 keydown 里做 Tab 循环（不引入新依赖）。

## 范围外（HARD LOCK）
支付/订单状态逻辑、API、DB、better-auth 流程不动；robots.txt 只新增只读 GET。
