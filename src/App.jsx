import { useState, useEffect } from 'react';
import { AppProvider, useApp, useRoute, navigate } from './app-context.jsx';
import Home from './pages/Home.jsx';
import SearchPage from './pages/Search.jsx';
import Detail from './pages/Detail.jsx';
import Player from './pages/Player.jsx';
import Collect from './pages/Collect.jsx';
import History from './pages/History.jsx';
import Timeline from './pages/Timeline.jsx';
import Rules from './pages/Rules.jsx';
import Settings from './pages/Settings.jsx';
import './styles.css';

function TopBar({ path }) {
  const { settings, setSettings } = useApp();
  const [kw, setKw] = useState('');
  const tabs = [
    ['/timeline', '时间表'],
    ['/collect', '追番'],
    ['/history', '历史'],
    ['/rules', '规则'],
    ['/settings', '设置'],
  ];
  const doSearch = () => {
    if (kw.trim()) navigate(`/search?q=${encodeURIComponent(kw.trim())}`);
  };
  const toggleTheme = () => {
    const order = ['auto', 'dark', 'light'];
    const next = order[(order.indexOf(settings.theme) + 1) % 3];
    setSettings({ ...settings, theme: next });
  };
  return (
    <header className="appbar">
      <div className="logo" onClick={() => navigate('/')}>
        <div className="icon">K</div><span className="txt">Kazumi Web</span>
      </div>
      <div className="search">
        <span>🔍</span>
        <input
          placeholder="搜索番剧名称…"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
        />
      </div>
      <nav className="nav-tabs">
        {tabs.map(([to, label]) => (
          <button key={to} className={`nav-tab ${path === to ? 'active' : ''}`} onClick={() => navigate(to)}>{label}</button>
        ))}
        <button className="nav-tab" onClick={toggleTheme} title={`主题: ${settings.theme}`}>
          {settings.theme === 'dark' ? '🌙' : settings.theme === 'light' ? '☀️' : '🖥️'}
        </button>
      </nav>
    </header>
  );
}

function Shell() {
  const { path, params } = useRoute();
  const { toast } = useApp();

  let page = null;
  if (path === '/' ) page = <Home />;
  else if (path === '/search') page = <SearchPage params={params} />;
  else if (path === '/detail') page = <Detail params={params} />;
  else if (path === '/collect') page = <Collect />;
  else if (path === '/history') page = <History />;
  else if (path === '/timeline') page = <Timeline />;
  else if (path === '/rules') page = <Rules />;
  else if (path === '/settings') page = <Settings />;

  // 播放器全屏覆盖层
  const isPlayer = path === '/player';

  return (
    <>
      {!isPlayer && <TopBar path={path} />}
      <main className="page">{page}</main>
      {isPlayer && <Player params={params} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function ThemedApp({ children }) {
  const { settings } = useApp();
  useEffect(() => {
    const apply = () => {
      const dark = settings.theme === 'dark' ||
        (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (settings.theme === 'auto') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [settings.theme]);
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <ThemedApp>
        <Shell />
      </ThemedApp>
    </AppProvider>
  );
}
