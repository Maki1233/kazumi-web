import { useApp, navigate } from '../app-context.jsx';

export default function History() {
  const { history, clearHistory } = useApp();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 className="page-title" style={{ flex: 1 }}>观看历史（{history.length}）</h2>
        {history.length > 0 && <button className="btn danger" onClick={clearHistory}>清空历史</button>}
      </div>
      {history.length === 0 && (
        <div className="empty"><div className="big">🕒</div><p>暂无观看记录</p></div>
      )}
      {history.map((h) => (
        <div className="row" key={h.detailUrl + h.epName}>
          <div className="grow" onClick={() => navigate(
            `/player?rule=${encodeURIComponent(h.ruleName)}&url=${encodeURIComponent(h.epUrl)}&anime=${encodeURIComponent(h.animeName)}&ep=${encodeURIComponent(h.epName)}&detail=${encodeURIComponent(h.detailUrl)}`
          )}>
            <div className="title">{h.animeName} · {h.epName}</div>
            <div className="sub">{h.ruleName} · {new Date(h.watchedAt).toLocaleString()}</div>
          </div>
          <button className="btn sm tonal" onClick={() => navigate(
            `/player?rule=${encodeURIComponent(h.ruleName)}&url=${encodeURIComponent(h.epUrl)}&anime=${encodeURIComponent(h.animeName)}&ep=${encodeURIComponent(h.epName)}&detail=${encodeURIComponent(h.detailUrl)}`
          )}>继续观看</button>
          <button className="btn sm outline" onClick={() => navigate(
            `/detail?rule=${encodeURIComponent(h.ruleName)}&url=${encodeURIComponent(h.detailUrl)}&anime=${encodeURIComponent(h.animeName)}`
          )}>详情</button>
        </div>
      ))}
    </div>
  );
}
