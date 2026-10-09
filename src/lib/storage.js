// 本地持久化封装：localStorage 优先，失败降级到内存（file:// 或隐私模式下仍可运行）
const mem = {};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return key in mem ? mem[key] : fallback;
}

export function saveJSON(key, value) {
  mem[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* ignore */ }
}

export function usePersisted(initFn) {
  // 返回初始值计算函数（由 Store 在 useState 初始化时调用），变更时由副作用保存
  return initFn;
}
