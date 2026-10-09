import { useApp, navigate } from '../app-context.jsx';

export default function Collect() {
  const { collect, toggleCollect } = useApp();
  return (
    <div>
      <h2 className="page-title">我的追番（{collect.length}）</h2>
      {collect.length === 0 && (
        <div className="empty">
          <div className="big">☆</div>
          <p>还没有追番，去搜索一部番剧并点击「追番」吧</p>
          <button className="btn tonal" onClick={() => navigate('/')}>去搜索</button>
        </div>
      )}
      <div className="grid">
        {collect.map((c) => (
          <div className="card" key={c.detailUrl}>
            <div className="name" onClick={() => navigate(`/detail?rule=${encodeURIComponent(c.ruleName)}&url=${encodeURIComponent(c.detailUrl)}&anime=${encodeURIComponent(c.name)}`)}>{c.name}</div>
            <div className="meta">
              <span className="badge" onClick={() => navigate(`/detail?rule=${encodeURIComponent(c.ruleName)}&url=${encodeURIComponent(c.detailUrl)}&anime=${encodeURIComponent(c.name)}`)}>{c.ruleName}</span>
              <button className="btn sm tonal" onClick={() => toggleCollect(c)}>取消追番</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
