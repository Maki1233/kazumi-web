// 规则引擎核心：对应 Kazumi 的 XPathRuleStrategy + WebSniffer
// 流程：searchURL(@keyword) → 代理抓取 → XPath 提取列表 → 详情页 → 线路×分集 → 播放页嗅探视频地址
import { parseHTML, queryAll, queryOne, nodeText, nodeAttr, normalizeUrl } from './xpath.js';
import { fetchViaProxy } from './proxy.js';

// ===== 规则校验 =====
export function validateRule(rule) {
  const errors = [];
  const need = ['name', 'baseURL', 'searchURL', 'searchList', 'searchName', 'searchResult', 'chapterRoads', 'chapterResult'];
  for (const k of need) {
    if (!rule[k] || !String(rule[k]).trim()) errors.push(`缺少必填字段: ${k}`);
  }
  if (rule.baseURL && !/^https?:\/\//.test(rule.baseURL)) errors.push('baseURL 必须以 http(s):// 开头');
  if (rule.searchURL && !rule.searchURL.includes('@keyword')) errors.push('searchURL 必须包含 @keyword 占位符');
  return errors;
}

export function isRuleEnabled(rule) {
  return rule.enabled !== false;
}

// ===== 搜索 =====
// 返回 [{ name, detailUrl, ruleName }]
export async function searchByRule(proxyTemplate, rule, keyword) {
  const searchUrl = rule.searchURL.replace('@keyword', encodeURIComponent(keyword));
  const raw = await fetchViaProxy(proxyTemplate, searchUrl, {
    referer: rule.referer || rule.baseURL,
    userAgent: rule.userAgent,
  });
  const root = parseHTML(raw);
  const items = [];
  const nodes = queryAll(root, rule.searchList);
  for (const node of nodes) {
    try {
      const nameNode = queryOne(node, rule.searchName);
      const linkNode = queryOne(node, rule.searchResult);
      const name = nameNode ? nodeText(nameNode) : '';
      let href = linkNode ? nodeAttr(linkNode, 'href') : '';
      if (!name || !href) continue;
      const detailUrl = normalizeUrl(rule.baseURL, href);
      if (!/^https?:\/\//.test(detailUrl)) continue;
      items.push({ name, detailUrl, ruleName: rule.name });
    } catch (e) { /* 单个节点失败跳过 */ }
  }
  return items;
}

// 并发搜索所有启用规则，单条失败不影响整体
export async function searchAllRules(proxyTemplate, rules, keyword, { concurrency = 4 } = {}) {
  const results = [];
  const queue = [...rules];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const rule = queue.shift();
      try {
        const items = await searchByRule(proxyTemplate, rule, keyword);
        results.push(...items);
      } catch (e) {
        console.warn(`[规则 ${rule.name}] 搜索失败:`, e.message);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ===== 线路 × 分集 =====
// 返回 [{ name: '线路名', episodes: [{ name, url }] }]
export async function getChapterRoads(proxyTemplate, rule, detailUrl) {
  const raw = await fetchViaProxy(proxyTemplate, detailUrl, {
    referer: rule.referer || rule.baseURL,
    userAgent: rule.userAgent,
  });
  const root = parseHTML(raw);
  const roads = [];
  const roadNodes = queryAll(root, rule.chapterRoads);
  for (let i = 0; i < roadNodes.length; i++) {
    const roadNode = roadNodes[i];
    const episodes = [];
    try {
      const epNodes = queryAll(roadNode, rule.chapterResult);
      for (const ep of epNodes) {
        const href = nodeAttr(ep, 'href');
        const text = nodeText(ep);
        if (!href || !text) continue;
        episodes.push({ name: text, url: normalizeUrl(detailUrl, href) });
      }
    } catch (e) { /* 跳过坏线路 */ }
    if (episodes.length) {
      roads.push({ name: roadNode.getAttribute('data-title') || `线路 ${i + 1}`, episodes });
    }
  }
  return roads;
}

// ===== 播放页嗅探：从播放页 HTML 中提取视频直链 =====
// 对应 Kazumi 的 WebSniffer：优先 m3u8 → mp4 → iframe 嵌套
const M3U8_RE = /https?:\/\/[^\s"'()<>]+?\.m3u8[^\s"'()<>]*/gi;
const MP4_RE = /https?:\/\/[^\s"'()<>]+?\.mp4[^\s"'()<>]*/gi;
const UNESCAPE_RE = /\\u002F|\\u002f|\\\//g;

export function sniffVideoUrl(html) {
  if (!html) return null;
  const unescaped = html.replace(/\\u002F/gi, '/').replace(UNESCAPE_RE, '/');
  // 1. m3u8
  let m = unescaped.match(M3U8_RE);
  if (m && m.length) {
    // 优先不带 ad/广告 的链接
    const clean = m.find((u) => !/ad(s)?[._/-]|insert|preroll/i.test(u)) || m[0];
    return { type: 'm3u8', url: clean };
  }
  // 2. mp4
  m = unescaped.match(MP4_RE);
  if (m && m.length) return { type: 'mp4', url: m[0] };
  // 3. iframe 嵌套页
  const doc = parseHTML(html);
  const iframe = doc.querySelector('iframe[src]');
  if (iframe) {
    const src = iframe.getAttribute('src').trim();
    if (/^https?:\/\//.test(src)) return { type: 'iframe', url: src };
  }
  return null;
}

export async function resolveEpisodeVideo(proxyTemplate, rule, episodeUrl, depth = 0) {
  const raw = await fetchViaProxy(proxyTemplate, episodeUrl, {
    referer: rule.referer || rule.baseURL,
    userAgent: rule.userAgent,
  });
  const found = sniffVideoUrl(raw);
  if (found) {
    if (found.type === 'iframe' && depth < 2) {
      // 跟进一层 iframe
      try {
        const nested = await resolveEpisodeVideo(proxyTemplate, rule, found.url, depth + 1);
        if (nested) return nested;
      } catch (e) { /* iframe 抓取失败则回退 */ }
      return found;
    }
    return found;
  }
  return null;
}
