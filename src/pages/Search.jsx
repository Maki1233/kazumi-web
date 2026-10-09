import { useEffect, useState, useRef } from 'react';
import { useApp, navigate } from '../app-context.jsx';
import { searchAllRules } from '../lib/engine.js';

export default function SearchPage({ params }) {
  const { enabledRules, settings, pushSearchHistory, searchHistory, setSearchHistory } = useApp();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastQ = useRef('');

  useEffect(() => {
    if (!q || q === lastQ.current) return;
    lastQ.current = q;
    pushSearchHistory(q);
    setLoading(true);
    setError(null);
    setResults(null);
    searchAllRules(settings.proxyTemplate, enabledRules, q)
      .then((items) => setResults(items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div>
      <h2 className="page-title">
        {q ? `「${q}」的搜索结果` : '搜索'}
        {results && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--on-surface-var)' }}> · {results.length} 条</span>}
      </h2>

      {searchHistory.length > 0 && !loading && !results && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--on-surface-var)' }}>搜索历史</span>
            <button className="btn sm outline" onClick={() => setSearchHistory([])}>清空</button>
          </div>
          <div className="hint-tags" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
            {searchHistory.map((h) => (
              <span className="tag" key={h} onClick={() => navigate(`/search?q=${encodeURIComponent(h)}`)}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="empty">
          <div className="spinner" style={{ borderTopColor: 'var(--primary)' }} />
          <p style={{ marginTop: 16 }}>正在通过 {enabledRules.length} 条规则并发搜索…</p>
          <p style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>取决于 CORS 代理速度，可能需要 10-30 秒</p>
        </div>
      )}

      {error && (
        <div className="empty">
          <div className="big">⚠️</div>
          <p>搜索失败: {error}</p>
          <p style={{ fontSize: 13, color: 'var(--on-surface-var)' }}>可以在「设置」中更换 CORS 代理后重试</p>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="empty">
          <div className="big">🔍</div>
          <p>没有找到结果</p>
          <p style={{ fontSize: 13, color: 'var(--on-surface-var)' }}>
            可能是代理不可用或规则站点已失效，可尝试在「设置」更换代理、在「规则」页检查站点状态
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="grid">
          {results.map((r, i) => (
            <div className="card" key={i} onClick={() => navigate(
              `/detail?rule=${encodeURIComponent(r.ruleName)}&url=${encodeURIComponent(r.detailUrl)}&anime=${encodeURIComponent(r.name)}`
            )}>
              <div className="name">{r.name}</div>
              <div className="meta">
                <span className="badge">{r.ruleName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
