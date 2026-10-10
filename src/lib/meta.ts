export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} — siteFlow` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — siteFlow` },
    { property: "og:description", content: description },
  ],
});
