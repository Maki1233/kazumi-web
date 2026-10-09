// 基于浏览器原生 document.evaluate 的 XPath 引擎（对应 Kazumi 的 xpath_selector_html_parser）
// Kazumi 只支持以 // 开头的选择器，这里对 .// 与 /self:: 也做了兼容

export function parseHTML(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  return doc.body;
}

function selectNodes(root, expr) {
  // document.evaluate 需要 Document 或节点的 ownerDocument
  const owner = root.ownerDocument || root;
  const scope = root.nodeType === 9 ? root.documentElement : root;
  // 对以 .// 开头或需要上下文节点的表达式，用 . 前缀在 scope 上求值
  let xpath = expr;
  let context = scope;
  if (!expr.startsWith('/') && !expr.startsWith('.')) {
    // 例如 "div[1]/a" 这类相对表达式 → 在当前节点下找
    xpath = './/' + expr;
  }
  const it = owner.evaluate(
    xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
  );
  const nodes = [];
  for (let i = 0; i < it.snapshotLength; i++) nodes.push(it.snapshotItem(i));
  return nodes;
}

export function queryAll(root, expr) {
  try {
    return selectNodes(root, expr);
  } catch (e) {
    throw new Error(`XPath 选择器无效: ${expr} (${e.message})`);
  }
}

export function queryOne(root, expr) {
  return queryAll(root, expr)[0] || null;
}

export function nodeText(node) {
  return (node?.textContent || '').trim();
}

export function nodeAttr(node, attr) {
  return (node?.getAttribute?.(attr) || '').trim();
}

// 相对 URL 归一化（对应 Kazumi 的 normalizeEpisodeUrl）
export function normalizeUrl(baseUrl, source) {
  if (!source) return '';
  const s = source.trim();
  if (/^https?:\/\//i.test(s)) return s;
  try {
    const base = new URL(baseUrl);
    if (s.startsWith('//')) return base.protocol + s;
    if (s.startsWith('/')) return base.origin + s;
    // 相对路径：先尝试基于 baseURL 目录解析
    return new URL(s, base.href).href;
  } catch {
    return s;
  }
}
