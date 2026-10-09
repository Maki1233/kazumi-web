// CORS 代理请求层：浏览器无法直接请求第三方视频站，所有抓取走可配置代理
// 模板格式：
//   https://cors.eu.org/{rawUrl}              —— {rawUrl} 替换为原始地址（前缀直通式）
//   https://api.allorigins.win/get?url={url}  —— {url} 替换为 encodeURIComponent 后的地址
// 部分代理返回 JSON 包装（{contents: "..."}），会自动解包

export const PROXY_PRESETS = [
  { id: 'corseu', name: 'cors.eu.org（推荐）', template: 'https://cors.eu.org/{rawUrl}' },
  { id: 'allorigins', name: 'AllOrigins', template: 'https://api.allorigins.win/get?url={url}', unwrap: true },
  { id: 'corsproxy', name: 'corsproxy.io（需 API key）', template: 'https://corsproxy.io/?url={url}' },
  { id: 'codetabs', name: 'CodeTabs', template: 'https://api.codetabs.com/v1/proxy/?quest={url}' },
  { id: 'thingproxy', name: 'ThingProxy', template: 'https://thingproxy.freeboard.io/fetch/{rawUrl}' },
];

export function buildProxiedUrl(template, targetUrl) {
  if (!template) return targetUrl;
  if (template.includes('{rawUrl}')) {
    return template.replace('{rawUrl}', targetUrl);
  }
  return template.replace('{url}', encodeURIComponent(targetUrl));
}

function unwrapIfJSONWrapped(text) {
  const t = text.trimStart();
  if (t.startsWith('{"contents"')) {
    try {
      const obj = JSON.parse(t);
      if (typeof obj.contents === 'string') return obj.contents;
    } catch (e) { /* 不是合法 JSON 就按原文返回 */ }
  }
  return text;
}

// 抓取 HTML（搜索页 / 详情页 / 播放页）
// 注意：不要附加任何自定义请求头（X-Referer 等），否则会触发 CORS 预检（OPTIONS），
// 公共代理普遍不支持预检，请求会直接失败。Referer/UA 需在自建代理侧注入。
export async function fetchViaProxy(proxyTemplate, targetUrl, { method = 'GET', timeout = 20000 } = {}) {
  const url = buildProxiedUrl(proxyTemplate, targetUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return unwrapIfJSONWrapped(text);
  } finally {
    clearTimeout(timer);
  }
}
