import { useEffect, useState } from 'react';
import { useApp, navigate } from '../app-context.jsx';
import { fetchBangumiCalendar } from '../store.js';

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function Timeline() {
  const { showToast } = useApp();
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBangumiCalendar()
      .then(setDays)
      .catch((e) => setError(e.message));
  }, []);

  const todayIdx = (new Date().getDay() + 6) % 7; // 周一=0

  const search = (name) => {
    navigate(`/search?q=${encodeURIComponent(name)}`);
  };

  return (
    <div>
      <h2 className="page-title">新番时间表 <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--on-surface-var)' }}>数据来自 Bangumi</span></h2>
      {error && (
        <div className="empty"><div className="big">⚠️</div><p>Bangumi API 请求失败: {error}</p></div>
      )}
      {days && days.map((d, i) => (
        <div className="cal-day" key={i}>
          <h4>{WEEK_LABELS[i] || d.weekday?.cn} {i === todayIdx && <span className="today-badge">今天</span>}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 4 }}>
            {d.items.map((it) => (
              <div className="cal-item" key={it.id} onClick={() => search(it.name_cn || it.name)} title="点击搜索本番剧">
                <img src={it.images?.small || it.images?.medium || ''} alt="" loading="lazy"
                  referrerPolicy="no-referrer" />
                <div>
                  <div className="t">{it.name_cn || it.name}</div>
                  <div className="s">
                    {it.rating?.score ? `★ ${it.rating.score}` : ''}
                    {it.new ? ' · 新番' : ''} {it.air_weekday ? '' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
