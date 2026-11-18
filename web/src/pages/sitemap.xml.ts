import { REPO_ROOT } from "../data/index.ts";
import { getBuild } from "../lib/build.ts";
import { pageLastmod, pageUrls, sitemapXml } from "../lib/sitemap.ts";

export const GET = () => {
  const urls = pageUrls(getBuild().site);
  const { date, source } = pageLastmod(REPO_ROOT);
  console.log(`sitemap.xml: ${urls.length} URLs, lastmod ${date} from ${source}`);
  return new Response(sitemapXml(urls, date), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
