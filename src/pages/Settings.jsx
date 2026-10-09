import { useApp } from '../app-context.jsx';
import { PROXY_PRESETS, buildProxiedUrl, fetchViaProxy } from '../lib/proxy.js';

export default function Settings() {
  const { settings, setSettings, showToast } = useApp();
  const isPreset = PROXY_PRESETS.some((p) => p.template === settings.proxyTemplate);

  const testProxy = async () => {
    showToast('正在测试代理…');
    try {
      const t0 = Date.now();
      const html = await fetchViaProxy(settings.proxyTemplate, 'https://www.agedm.io/', { timeout: 15000 });
      const ok = /agedm|age|html/i.test(html.slice(0, 2000));
      showToast(ok ? `代理可用 ✓ (${Date.now() - t0}ms)` : '代理返回异常内容，建议更换');
    } catch (e) {
      showToast(`代理不可用: ${e.message}`);
    }
  };

  return (
    <div>
      <h2 className="page-title">设置</h2>

      <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div>
          <div className="label">CORS 代理</div>
          <div className="desc">
            浏览器无法直接请求第三方视频站，所有规则抓取与 m3u8 播放都经由此代理转发。
            代理不稳定时请更换。自建代理可填入自定义模板，{'{url}'} 会被替换为编码后的目标地址。
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <select
            value={isPreset ? settings.proxyTemplate : 'custom'}
            onChange={(e) => setSettings({ ...settings, proxyTemplate: e.target.value === 'custom' ? '' : e.target.value })}
          >
            {PROXY_PRESETS.map((p) => (
              <option key={p.id} value={p.template}>{p.name}</option>
            ))}
            <option value="custom">自定义…</option>
          </select>
          {!isPreset && (
            <input
              className="input" style={{ flex: 1, minWidth: 220 }}
              placeholder="https://your-proxy/?url={url}"
              value={settings.proxyTemplate}
              onChange={(e) => setSettings({ ...settings, proxyTemplate: e.target.value })}
            />
          )}
          <button className="btn" onClick={testProxy}>测试代理</button>
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          当前实际请求示例: <code style={{ wordBreak: 'break-all' }}>{buildProxiedUrl(settings.proxyTemplate, 'https://example.com/search?q=x')}</code>
        </div>
      </div>

      <div className="setting-row">
        <div>
          <div className="label">自动播放</div>
          <div className="desc">进入播放页后自动开始播放</div>
        </div>
        <label className="switch">
          <input type="checkbox" checked={settings.playerAutoPlay} onChange={(e) => setSettings({ ...settings, playerAutoPlay: e.target.checked })} />
          <span className="track" />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <div className="label">记住播放进度</div>
          <div className="desc">记录每集观看位置，重新打开时自动跳转；选集列表会标记已看过的集</div>
        </div>
        <label className="switch">
          <input type="checkbox" checked={settings.rememberProgress} onChange={(e) => setSettings({ ...settings, rememberProgress: e.target.checked })} />
          <span className="track" />
        </label>
      </div>

      <div className="setting-row">
        <div>
          <div className="label">主题</div>
          <div className="desc">跟随系统 / 深色 / 浅色</div>
        </div>
        <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
          <option value="auto">跟随系统</option>
          <option value="dark">深色</option>
          <option value="light">浅色</option>
        </select>
      </div>

      <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div>
          <div className="label">关于</div>
          <div className="desc">
            Kazumi Web 是开源项目 <a href="https://github.com/Predidit/Kazumi" target="_blank" style={{ color: 'var(--primary)' }}>Predidit/Kazumi</a> 的纯前端 Web 复刻，
            规则格式与官方 <a href="https://github.com/Predidit/KazumiRules" target="_blank" style={{ color: 'var(--primary)' }}>KazumiRules</a> 仓库兼容。
            本项目仅做技术学习用途，不存储任何视频资源，请支持正版。
          </div>
        </div>
      </div>
    </div>
  );
}
