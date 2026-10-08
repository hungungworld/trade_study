// 임시: 후보 RSS가 동작하는지, 첫 기사 본문을 추출할 수 있는지 확인한다.
import Parser from "rss-parser";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";

const UA = "Mozilla/5.0 (compatible; trade-study-bot/1.0; +https://github.com/hungungworld/trade_study)";
const CANDIDATES = [
  ["매일경제 전체", "https://www.mk.co.kr/rss/30000001/"],
  ["매일경제 경제", "https://www.mk.co.kr/rss/30100041/"],
  ["매일경제 기업", "https://www.mk.co.kr/rss/50100032/"],
  ["매일경제 국제", "https://www.mk.co.kr/rss/30300018/"],
  ["매일경제 사설", "https://www.mk.co.kr/rss/30500001/"],
  ["매일경제 오피니언", "https://www.mk.co.kr/rss/30200030/"],
  ["한국경제 경제", "https://www.hankyung.com/feed/economy"],
  ["한국경제 산업", "https://www.hankyung.com/feed/industry"],
  ["한국경제 국제", "https://www.hankyung.com/feed/international"],
  ["한국경제 오피니언", "https://www.hankyung.com/feed/opinion"],
  ["서울경제", "https://www.sedaily.com/rss/economy"],
  ["서울경제 산업", "https://www.sedaily.com/rss/industry"],
  ["이데일리 경제", "https://rss.edaily.co.kr/economy_news.xml"],
  ["머니투데이", "https://rss.mt.co.kr/mt_news.xml"],
  ["아시아경제", "https://www.asiae.co.kr/rss/economy.htm"],
  ["헤럴드경제", "https://biz.heraldcorp.com/rss/google/economy"],
  ["동아일보 사설", "https://rss.donga.com/editorial.xml"],
  ["동아일보 경제", "https://rss.donga.com/economy.xml"],
  ["조선일보 오피니언", "https://www.chosun.com/arc/outboundfeeds/rss/category/opinion/?outputType=xml"],
  ["조선일보 경제", "https://www.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml"],
  ["경향신문 오피니언", "https://www.khan.co.kr/rss/rssdata/opinion_news.xml"],
  ["한겨레 사설·칼럼", "https://www.hani.co.kr/rss/opinion/"],
  ["한겨레 경제", "https://www.hani.co.kr/rss/economy/"],
  ["중앙일보 오피니언", "https://rss.joins.com/joins_opinion_list.htm"],
  ["연합뉴스 경제", "https://www.yna.co.kr/rss/economy.xml"],
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  const charset = /charset=([^;]+)/i.exec(res.headers.get("content-type") || "")?.[1]?.trim() || "utf-8";
  const buf = await res.arrayBuffer();
  let text;
  try { text = new TextDecoder(charset).decode(buf); } catch { text = new TextDecoder().decode(buf); }
  return { status: res.status, text };
}

const parser = new Parser();
for (const [name, url] of CANDIDATES) {
  try {
    const { status, text } = await fetchText(url);
    if (status !== 200) { console.log(`✗ ${name} | HTTP ${status} | ${url}`); continue; }
    const feed = await parser.parseString(text);
    const items = feed.items || [];
    const titles = items.slice(0, 4).map((i) => i.title?.slice(0, 40)).join(" / ");
    const editorialCount = items.filter((i) => /사설/.test(i.title || "") || /사설/.test((i.categories || []).join(" "))).length;
    let bodyLen = "-";
    if (items[0]?.link) {
      const page = await fetchText(items[0].link);
      const dom = new JSDOM(page.text, { url: items[0].link, virtualConsole: new VirtualConsole() });
      bodyLen = `${page.status}:${new Readability(dom.window.document).parse()?.textContent?.trim().length ?? 0}자`;
    }
    console.log(`✓ ${name} | ${items.length}건 | 사설표시 ${editorialCount} | 본문 ${bodyLen} | ${titles}`);
  } catch (e) {
    console.log(`✗ ${name} | ${e.message} | ${url}`);
  }
}
