import { useState } from 'react';
import { useApp, navigate } from '../app-context.jsx';

export default function Home() {
  const { searchHistory, enabledRules, history } = useApp();
  const [kw, setKw] = useState('');

  const go = (q) => navigate(`/search?q=${encodeURIComponent(q)}`);

  return (
    <div>
      <div className="search-bar-hero">
        <h1>Kazumi Web</h1>
        <p>基于自定义规则的番剧采集与在线观看 · 当前已启用 {enabledRules.length} 条规则</p>
        <div className="search">
          <input
            placeholder="输入番剧名称，回车搜索…"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && kw.trim() && go(kw.trim())}
          />
          <button onClick={() => kw.trim() && go(kw.trim())}>搜索</button>
        </div>
        <div className="hint-tags">
          {searchHistory.slice(0, 8).map((h) => (
            <span className="tag" key={h} onClick={() => go(h)}>{h}</span>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ maxWidth: 620, margin: '48px auto 0' }}>
          <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>继续观看</h3>
          {history.slice(0, 4).map((h) => (
            <div className="row" key={h.detailUrl + h.epName} onClick={() => navigate(
              `/player?rule=${encodeURIComponent(h.ruleName)}&url=${encodeURIComponent(h.epUrl)}&anime=${encodeURIComponent(h.animeName)}&ep=${encodeURIComponent(h.epName)}&detail=${encodeURIComponent(h.detailUrl)}`
            )}>
              <div className="grow">
                <div className="title">{h.animeName}</div>
                <div className="sub">{h.epName} · {h.ruleName} · {new Date(h.watchedAt).toLocaleString()}</div>
              </div>
              <button className="btn sm tonal">继续</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
