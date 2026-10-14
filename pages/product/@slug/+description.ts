function toPlainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Meta description: subtitle first, topped up with the description text so it is not a 10-character stub. */
export default function description(pageContext: { data?: { name?: string; subtitle?: string | null; description?: string | null }; site?: { subtitle?: string | null } }) {
  const product = pageContext.data;
  const subtitle = product?.subtitle?.trim() || "";
  const body = product?.description ? toPlainText(product.description) : "";
  let text = subtitle || body;
  if (subtitle && body && subtitle.length < 70 && !body.startsWith(subtitle)) text = `${subtitle}。${body}`;
  if (text && product?.name && !text.includes(product.name)) text = `${product.name}：${text}`;
  return (text || pageContext.site?.subtitle || "自动发卡系统").slice(0, 160);
}
