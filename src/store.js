// 全局状态：规则库 / 追番 / 历史 / 搜索历史 / 设置，全部持久化到 localStorage
import { createContext, useContext } from 'react';
import { loadJSON, saveJSON } from './lib/storage.js';
import builtinRules from './lib/builtin-rules.json';
import { PROXY_PRESETS } from './lib/proxy.js';

const K = {
  rules: 'kazumi.rules',
  collect: 'kazumi.collect',
  history: 'kazumi.history',
  searchHistory: 'kazumi.searchHistory',
  settings: 'kazumi.settings',
  progress: 'kazumi.progress',
};

export function loadRules() {
  const saved = loadJSON(K.rules, null);
  if (saved && Array.isArray(saved) && saved.length) {
    // 内置规则更新时按 name 合并（enabled 状态保留用户设置）
    const savedNames = new Set(saved.map((r) => r.name));
    const merged = [...saved, ...builtinRules.filter((r) => !savedNames.has(r.name))];
    return merged;
  }
  return builtinRules.map((r) => ({ ...r }));
}

export const defaultSettings = {
  proxyTemplate: PROXY_PRESETS[0].template,
  playerAutoPlay: true,
  rememberProgress: true,
  theme: 'auto', // auto | dark | light
};

export function loadSettings() {
  return { ...defaultSettings, ...loadJSON(K.settings, {}) };
}

export function loadCollect() { return loadJSON(K.collect, []); }
export function loadHistory() { return loadJSON(K.history, []); }
export function loadSearchHistory() { return loadJSON(K.searchHistory, []); }
export function loadProgress() { return loadJSON(K.progress, {}); }

export function saveRules(rules) { saveJSON(K.rules, rules); }
export function saveSettings(s) { saveJSON(K.settings, s); }
export function saveCollect(c) { saveJSON(K.collect, c); }
export function saveHistory(h) { saveJSON(K.history, h); }
export function saveSearchHistory(h) { saveJSON(K.searchHistory, h); }
export function saveProgress(p) { saveJSON(K.progress, p); }

// 进度 key：detailUrl|集名
export function progressKey(detailUrl, epName) { return `${detailUrl}::${epName}`; }

// ===== Bangumi API（api.bgm.tv 支持跨域，可直接请求）=====
export async function fetchBangumiCalendar() {
  const res = await fetch('https://api.bgm.tv/calendar', {
    headers: { 'User-Agent': 'kazumi-web/1.0 (github.com/kazumi-web)' },
  });
  if (!res.ok) throw new Error(`Bangumi API ${res.status}`);
  return res.json();
}

export async function searchBangumi(keyword) {
  const res = await fetch(
    `https://api.bgm.tv/search/subject?keyword=${encodeURIComponent(keyword)}&type=2&max_result=10`,
    { headers: { 'User-Agent': 'kazumi-web/1.0' } }
  );
  if (!res.ok) throw new Error(`Bangumi 搜索 ${res.status}`);
  return res.json();
}
