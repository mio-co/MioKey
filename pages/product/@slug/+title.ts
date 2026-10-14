export default function title(pageContext: { data?: { name?: string }; site?: { name?: string } }) {
  const siteName = pageContext.site?.name || "MioKey";
  return pageContext.data?.name ? `${pageContext.data.name} - ${siteName}` : siteName;
}
