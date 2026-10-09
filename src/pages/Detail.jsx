import { useEffect, useState } from 'react';
import { useApp, navigate } from '../app-context.jsx';
import { getChapterRoads } from '../lib/engine.js';

export default function Detail({ params }) {
  const { rules, settings, isCollected, toggleCollect, getEpProgress } = useApp();
  const ruleName = params.get('rule');
  const detailUrl = params.get('url');
  const animeName = params.get('anime');

  const rule = rules.find((r) => r.name === ruleName);
  const [roads, setRoads] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRoad, setActiveRoad] = useState(0);

  useEffect(() => {
    if (!rule || !detailUrl) { setError('缺少规则或详情地址'); setLoading(false); return; }
    getChapterRoads(settings.proxyTemplate, rule, detailUrl)
      .then((rs) => { setRoads(rs); setActiveRoad(0); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ruleName, detailUrl]);

  const playEp = (ep) => {
    navigate(`/player?rule=${encodeURIComponent(ruleName)}&url=${encodeURIComponent(ep.url)}&anime=${encodeURIComponent(animeName)}&ep=${encodeURIComponent(ep.name)}&detail=${encodeURIComponent(detailUrl)}`);
  };

  const collected = isCollected(detailUrl);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 className="page-title" style={{ margin: 0, flex: 1 }}>{animeName}</h2>
        <button className={`btn ${collected ? '' : 'tonal'}`} onClick={() => toggleCollect({ name: animeName, detailUrl, ruleName, lastEpisode: '' })}>
          {collected ? '★ 已追番' : '☆ 追番'}
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--on-surface-var)', marginBottom: 6 }}>
        来源: <span className="badge">{ruleName}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--on-surface-var)', marginBottom: 16, wordBreak: 'break-all' }}>{detailUrl}</div>

      {loading && (
        <div className="empty">
          <div className="spinner" style={{ borderTopColor: 'var(--primary)' }} />
          <p style={{ marginTop: 16 }}>正在解析线路与分集…</p>
        </div>
      )}
      {error && (
        <div className="empty">
          <div className="big">⚠️</div><p>解析失败: {error}</p>
          <p style={{ fontSize: 13, color: 'var(--on-surface-var)' }}>可尝试在设置中更换 CORS 代理</p>
        </div>
      )}
      {roads && roads.length === 0 && (
        <div className="empty"><div className="big">📺</div><p>未解析到任何线路（规则可能已失效）</p></div>
      )}

      {roads && roads.length > 0 && (
        <>
          <div className="roads-tabs">
            {roads.map((r, i) => (
              <button key={i} className={`road-tab ${i === activeRoad ? 'active' : ''}`} onClick={() => setActiveRoad(i)}>
                {r.name}（{r.episodes.length}）
              </button>
            ))}
          </div>
          <div className="ep-grid">
            {roads[activeRoad].episodes.map((ep, j) => {
              const prog = getEpProgress(detailUrl, ep.name);
              return (
                <div key={j} className={`ep ${prog ? 'watched' : ''}`} title={prog ? `上次观看至 ${fmt(prog.seconds)}` : ''} onClick={() => playEp(ep)}>
                  {ep.name}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function fmt(s) {
  if (!s) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}
