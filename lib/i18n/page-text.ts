import { traditionalize } from "@/lib/i18n/zh-TW";

/**
 * Cycle 4: template-only translation for the order lookup, checkout and payment-result pages.
 * Those pages are payment pages whose <script> must stay unchanged, so their templates call the global
 * `$tr(中文)` (registered in pages/+onCreateApp.ts) instead of `t(key)`. zh-TW is derived from the
 * Simplified text with the same character/phrase map as the rest of the storefront; en-US comes from
 * this dictionary (keyed by the exact Simplified text). Unknown text is returned unchanged.
 */
const en: Record<string, string> = {
  // order lookup
  "订单中心": "Order center",
  "未登录下单也能查：输入订单号和下单邮箱，或用邮箱验证码找回本机订单记录。": "Ordered without signing in? Enter the order number and order email, or recover this device's orders with an email code.",
  "按订单号查询": "Look up by order number",
  "订单号可在下单后的页面或通知邮件中找到。": "The order number is shown after checkout and in the notification email.",
  "订单号": "Order number",
  "下单邮箱": "Order email",
  "查询失败": "Lookup failed",
  "查询中...": "Searching...",
  "查询订单": "Look up order",
  "忘记订单号？用邮箱找回": "Forgot the order number? Recover by email",
  "我们会向下单邮箱发送验证码，验证后把该邮箱最近的订单同步到这台设备。": "We'll send a code to the order email. After verifying, recent orders for that email are synced to this device.",
  "6 位验证码": "6-digit code",
  "仅恢复最近 50 个匿名订单；更早记录未写入本机。": "Only the 50 most recent guest orders are restored; older ones are not saved on this device.",
  "仅恢复最近 50 个匿名订单，更早记录未写入本机。": "Only the 50 most recent guest orders are restored; older ones are not saved on this device.",
  "更换邮箱": "Use another email",
  "处理中...": "Processing...",
  "验证并恢复": "Verify and restore",
  "发送验证码": "Send code",
  "返回": "Back",
  "返回匿名订单列表": "Back to guest order list",
  "订单详情": "Order details",
  "数量": "Quantity",
  "金额": "Amount",
  "支付状态": "Payment status",
  "发货状态": "Delivery status",
  "发货内容": "Delivery contents",
  "等待发货": "Awaiting delivery",
  "订单已支付，发货任务正在处理中。": "The order is paid and delivery is being processed.",
  "前往支付": "Go to payment",
  "正在生成支付信息...": "Generating payment details...",
  "继续支付": "Resume payment",
  "选择或查询订单": "Select or find an order",
  "本机订单": "Orders on this device",
  "在这台设备上下过的订单会保存在这里，按下单邮箱分组；点开可查看详情或继续支付。": "Orders placed on this device are kept here, grouped by order email. Open one to see details or resume payment.",
  "这台设备上还没有订单": "No orders on this device yet",
  "可以用订单号和下单邮箱查询，或用邮箱验证码找回订单记录。": "Look up an order with its number and email, or recover your orders with an email code.",
  "删除全部匿名订单": "Delete all guest orders",
  "删除 {name} 的订单": "Delete orders for {name}",
  "操作无法撤销。": " This can't be undone.",
  "删除全部匿名订单？": "Delete all guest orders?",
  "删除 {email} 的匿名订单？": "Delete guest orders for {email}?",
  "取消": "Cancel",
  "确认删除": "Delete",
  "此操作只会删除该邮箱分组，不影响其他邮箱的本机记录。": "Only this email's group is deleted; other emails' records on this device are kept.",
  "此操作会永久删除当前浏览器保存的全部匿名订单记录。": "This permanently deletes every guest order saved in this browser.",
  // status labels (returned by the page scripts)
  "待支付": "Pending payment",
  "已支付": "Paid",
  "支付失败": "Payment failed",
  "已发货": "Delivered",
  "已关闭": "Closed",
  "失败": "Failed",
  "未发货": "Not delivered",
  "发货中": "Delivering",
  "发货失败": "Delivery failed",
  // error messages (returned by the page scripts)
  "请输入订单号。": "Enter the order number.",
  "请输入有效的下单邮箱。": "Enter a valid order email.",
  "请输入 6 位数字验证码。": "Enter the 6-digit code.",
  "请输入该匿名订单的下单邮箱后查询。": "Enter this guest order's email to look it up.",
  "订单不存在，或下单邮箱不匹配。": "Order not found, or the email does not match.",
  "未找到当前账户下的该订单。": "No order with that number belongs to this account.",
  "暂时无法生成支付信息，请稍后再试。": "Payment details could not be generated. Please try again later.",
  "暂时无法继续支付，请稍后再试。": "Payment could not be resumed. Please try again later.",
  "验证码发送失败，请稍后再试。": "The code could not be sent. Please try again later.",
  "验证失败，原有本机订单未更改。": "Verification failed. Orders on this device were not changed.",
  "验证成功，但无法写入浏览器存储；原有本机订单未更改。": "Verified, but browser storage could not be written. Orders on this device were not changed.",
  "暂时无法生成支付二维码，请稍后再试。": "The payment QR code could not be generated. Please try again later.",
  "未找到本机订单，请返回订单页面使用订单号和下单邮箱查询。": "This order is not on this device. Go back to the order page and look it up with its number and email.",
  "缺少订单号，请返回订单页面重新选择订单。": "The order number is missing. Go back to the order page and choose the order again.",
  "支付回跳缺少订单号，请前往订单查询页输入订单信息。": "The payment return link has no order number. Open order lookup and enter the order details.",
  "暂时无法确认订单状态，请稍后重试。": "The order status could not be confirmed. Please try again shortly.",
  "本机未找到该匿名订单，请前往订单查询页输入下单邮箱。": "This guest order is not on this device. Open order lookup and enter the order email.",
  "正在确认订单状态。": "Confirming order status.",
  // checkout
  "订单支付": "Order payment",
  "无法继续支付": "Cannot continue payment",
  "没有找到可以继续支付的订单。": "No order that can be paid was found.",
  "正在确认订单信息...": "Confirming order details...",
  "商品": "Product",
  "订单金额": "Order amount",
  "扫码支付": "Scan to pay",
  "请按此金额付款，金额必须完全一致": "Pay exactly this amount; it must match to the cent",
  "请使用支付宝扫码付款": "Scan with Alipay to pay",
  "正在准备收款二维码...": "Preparing the payment QR code...",
  "支付完成后，页面会自动更新订单状态。": "After you pay, this page updates the order status automatically.",
  "该订单不使用站内扫码支付，请返回订单页面继续支付。": "This order doesn't use on-site QR payment. Go back to the order page to continue.",
  "正在加载订单...": "Loading order...",
  "返回首页": "Back to shop",
  "查看订单": "View order",
  "支付成功": "Payment successful",
  "订单已结束": "Order closed",
  "支付已确认，可返回订单查看发货进度。": "Payment confirmed. Go back to the order to follow delivery.",
  "该订单当前无法继续支付。": "This order can no longer be paid.",
  "正在生成...": "Generating...",
  "重新生成二维码": "Regenerate QR code",
  "订单号：": "Order number: ",
  // payment result
  "订单状态": "Order status",
  "支付通知可能仍在处理中，页面会自动查询订单状态。": "The payment notification may still be processing; this page checks the order status automatically.",
  "打开订单查询": "Open order lookup",
  "支付结果": "Payment result",
  "确认支付结果": "Confirming payment",
  "支付平台返回仅用于跳转；订单状态以本站查询和支付回调为准。": "The payment provider's return only redirects you; the order status shown here and the payment callback are authoritative.",
  "需要订单信息": "Order details needed",
  "刷新状态": "Refresh status",
};

export type PageTextLocale = "zh-CN" | "zh-TW" | "en-US";

export function translatePageText(text: string | null | undefined, locale: PageTextLocale, params?: Record<string, string | number>): string {
  if (text == null) return "";
  const translated = locale === "zh-TW" ? traditionalize(text) : locale === "en-US" ? en[text] ?? text : text;
  return params ? translated.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? "")) : translated;
}

export const pageTextKeys = Object.keys(en);
