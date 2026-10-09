import { useEffect, useRef, useState } from 'react';
import { useApp, navigate } from '../app-context.jsx';
import { resolveEpisodeVideo } from '../lib/engine.js';
import { attachHls, isHlsSupported } from '../lib/player.js';

// MSE 可用时优先 hls.js（可走代理）；否则回退原生 HLS
if (typeof window !== 'undefined') window.HlsSupportsMSE = isHlsSupported();

export default function Player({ params }) {
  const { rules, settings, recordWatch, saveEpProgress, getEpProgress, showToast } = useApp();
  const ruleName = params.get('rule');
  const epUrl = params.get('url');
  const animeName = params.get('anime') || '';
  const epName = params.get('ep') || '';
  const detailUrl = params.get('detail') || '';

  const rule = rules.find((r) => r.name === ruleName);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('resolving'); // resolving | playing | iframe | error
  const [errMsg, setErrMsg] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const savedAtRef = useRef(0);

  // 解析视频地址
  useEffect(() => {
    let cancelled = false;
    setStatus('resolving');
    (async () => {
      try {
        const found = await resolveEpisodeVideo(settings.proxyTemplate, rule, epUrl);
        if (cancelled) return;
        if (!found) {
          setStatus('error');
          setErrMsg('未能从播放页嗅探到视频地址（站点可能改版或需要验证）');
          return;
        }
        setVideoInfo(found);
        if (found.type === 'iframe') {
          setStatus('iframe');
          return;
        }
        // 等待 React 渲染出 <video> 元素后再挂载
        await new Promise((r) => setTimeout(r, 50));
        const video = videoRef.current;
        if (!video) throw new Error('播放器未就绪');
        if (found.type === 'm3u8') {
          if (window.HlsSupportsMSE) {
            // 整体超时兜底：代理链全部失败时不至于永远转圈
            const timeout = new Promise((_, rej) =>
              setTimeout(() => rej(new Error('加载超时：直连与代理出口均无法获取视频流')), 60000)
            );
            hlsRef.current = await Promise.race([
              attachHls(video, found.url, settings.proxyTemplate),
              timeout,
            ]);
          } else {
            video.src = found.url; // 不支持 MSE（如 iOS Safari），用原生 HLS（需 CDN 有 CORS 头）
          }
        } else {
          video.src = found.url;
        }
        video.autoplay = settings.playerAutoPlay;
        video.play().catch(() => { /* 自动播放被阻止，等用户点播放 */ });
        setStatus('playing');
      } catch (e) {
        if (!cancelled) { setStatus('error'); setErrMsg(e.message); }
      }
    })();
    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [epUrl]);

  // 记录历史 + 进度
  const onLoaded = () => {
    const prog = getEpProgress(detailUrl, epName);
    if (prog && prog.seconds > 5 && videoRef.current) {
      videoRef.current.currentTime = Math.min(prog.seconds, (videoRef.current.duration || prog.duration || Infinity) - 5);
    }
    recordWatch({ animeName, epName, epUrl, detailUrl, ruleName });
  };
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - savedAtRef.current < 3000) return; // 3 秒节流
    savedAtRef.current = now;
    saveEpProgress(detailUrl, epName, v.currentTime, v.duration || 0, { animeName, ruleName, epUrl });
  };

  const back = () => navigate(`/detail?rule=${encodeURIComponent(ruleName)}&url=${encodeURIComponent(detailUrl)}&anime=${encodeURIComponent(animeName)}`);

  return (
    <div className="player-wrap">
      {status !== 'iframe' && (
        <video
          ref={videoRef}
          className="player-video"
          style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}
          controls
          playsInline
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTimeUpdate}
        />
      )}
      {status === 'resolving' && (
        <div className="player-loading">
          <div className="spinner"></div>
          <div>正在解析视频地址…</div>
          <div style={{ fontSize: 12, opacity: .6 }}>通过代理嗅探 m3u8 / mp4 直链</div>
        </div>
      )}
      {status === 'iframe' && (
        <>
          <iframe src={videoInfo?.url} className="player-video" allowFullScreen frameBorder="0" />
          <div className="player-loading" style={{ pointerEvents: 'none', background: 'rgba(0,0,0,.5)', display: status === 'iframe' ? 'none' : 'flex' }} />
        </>
      )}
      {status === 'error' && (
        <div className="player-loading">
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div>播放失败</div>
          <div style={{ fontSize: 12, opacity: .7, maxWidth: 480, textAlign: 'center' }}>{errMsg}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {videoInfo && videoInfo.url && (
              <>
                <button className="btn tonal" onClick={() => { navigator.clipboard?.writeText(videoInfo.url); showToast('已复制视频直链'); }}>复制直链</button>
                <button className="btn tonal" onClick={() => window.open(videoInfo.url, '_blank')}>浏览器打开</button>
              </>
            )}
            <button className="btn outline" style={{ color: '#fff', borderColor: '#666' }} onClick={() => location.reload()}>重试</button>
            <button className="btn" onClick={back}>返回详情</button>
          </div>
          <div style={{ fontSize: 11, opacity: .5, maxWidth: 480, textAlign: 'center' }}>
            提示：视频 CDN 常有防盗链，可复制直链到 PotPlayer / VLC 等外部播放器观看，或在设置中更换代理
          </div>
        </div>
      )}
      <div className="player-bar">
        <button className="btn sm tonal" onClick={back}>← 返回</button>
        <div className="title">{animeName} · {epName} · [{ruleName}]</div>
        {videoInfo && videoInfo.type !== 'iframe' && (
          <button className="btn sm outline" style={{ color: '#fff', borderColor: '#666' }}
            onClick={() => { navigator.clipboard?.writeText(videoInfo.url); showToast('已复制视频直链'); }}>
            复制直链
          </button>
        )}
        {videoInfo?.type === 'm3u8' && <span style={{ fontSize: 12, opacity: .6 }}>HLS·代理中转</span>}
      </div>
    </div>
  );
}
