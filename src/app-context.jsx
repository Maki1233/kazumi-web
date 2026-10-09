// 应用级上下文：状态 + 动作（对应 Kazumi 的 MobX stores）
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  loadRules, saveRules, loadSettings, saveSettings,
  loadCollect, saveCollect, loadHistory, saveHistory,
  loadSearchHistory, saveSearchHistory, loadProgress, saveProgress,
  progressKey,
} from './store.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [rules, setRules] = useState(loadRules);
  const [settings, setSettings] = useState(loadSettings);
  const [collect, setCollect] = useState(loadCollect);
  const [history, setHistory] = useState(loadHistory);
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory);
  const [progress, setProgress] = useState(loadProgress);
  const [toast, setToast] = useState(null);

  useEffect(() => saveRules(rules), [rules]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveCollect(collect), [collect]);
  useEffect(() => saveHistory(history), [history]);
  useEffect(() => saveSearchHistory(searchHistory), [searchHistory]);
  useEffect(() => saveProgress(progress), [progress]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // ===== 规则 =====
  const enabledRules = rules.filter((r) => r.enabled !== false);
  const upsertRule = useCallback((rule) => {
    setRules((rs) => {
      const i = rs.findIndex((r) => r.name === rule.name);
      if (i >= 0) { const c = [...rs]; c[i] = rule; return c; }
      return [...rs, rule];
    });
  }, []);
  const removeRule = useCallback((name) => {
    setRules((rs) => rs.filter((r) => r.name !== name));
  }, []);
  const toggleRule = useCallback((name) => {
    setRules((rs) => rs.map((r) => (r.name === name ? { ...r, enabled: r.enabled === false } : r)));
  }, []);

  // ===== 追番 =====
  const isCollected = useCallback((detailUrl) => collect.some((c) => c.detailUrl === detailUrl), [collect]);
  const toggleCollect = useCallback((anime) => {
    setCollect((cs) => {
      const i = cs.findIndex((c) => c.detailUrl === anime.detailUrl);
      if (i >= 0) { const c = [...cs]; c.splice(i, 1); return c; }
      return [{ ...anime, addedAt: Date.now() }, ...cs];
    });
  }, []);

  // ===== 历史 =====
  const recordWatch = useCallback((entry) => {
    setHistory((hs) => {
      const key = `${entry.detailUrl}::${entry.epName}`;
      const rest = hs.filter((h) => `${h.detailUrl}::${h.epName}` !== key);
      return [{ ...entry, watchedAt: Date.now() }, ...rest].slice(0, 200);
    });
  }, []);
  const clearHistory = useCallback(() => setHistory([]), []);

  // ===== 搜索历史 =====
  const pushSearchHistory = useCallback((kw) => {
    if (!kw.trim()) return;
    setSearchHistory((h) => [kw, ...h.filter((x) => x !== kw)].slice(0, 20));
  }, []);

  // ===== 播放进度 =====
  const saveEpProgress = useCallback((detailUrl, epName, seconds, duration, extra) => {
    if (!settings.rememberProgress) return;
    setProgress((p) => ({ ...p, [progressKey(detailUrl, epName)]: { seconds, duration, updatedAt: Date.now(), ...extra } }));
  }, [settings.rememberProgress]);
  const getEpProgress = useCallback((detailUrl, epName) => progress[progressKey(detailUrl, epName)] || null, [progress]);

  const value = {
    rules, enabledRules, settings, setSettings, upsertRule, removeRule, toggleRule,
    collect, isCollected, toggleCollect,
    history, recordWatch, clearHistory,
    searchHistory, pushSearchHistory, setSearchHistory,
    progress, saveEpProgress, getEpProgress,
    toast, showToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() { return useContext(Ctx); }

// ===== 极简 hash 路由 =====
export function useRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const fn = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  const path = hash.replace(/^#/, '').split('?')[0] || '/';
  const params = new URLSearchParams(hash.split('?')[1] || '');
  return { path, params };
}

export function navigate(to) {
  window.location.hash = to;
}
