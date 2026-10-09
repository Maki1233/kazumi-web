// hls.js 智能加载器：直连优先，失败自动经 CORS 代理重试
// 很多视频 CDN 自带 Access-Control-Allow-Origin: *，直连即可播放（更快）；
// 遇到无 CORS 头的源时自动改走代理（代理可能被 CDN 反盗链拦截，此时回退 UI 提示）
import Hls from 'hls.js';
import { buildProxiedUrl, PROXY_PRESETS } from './proxy.js';

function createSmartLoader(proxyTemplates) {
  const BaseLoader = Hls.DefaultConfig.loader;
  return class SmartLoader extends BaseLoader {
    load(context, config, callbacks) {
      const originalUrl = context.url;
      // 每个 URL 维护已尝试的候选代理索引：直连 → 代理1 → 代理2 → …
      this._attempts = this._attempts || new Map();
      const wrappedCallbacks = {
        ...callbacks,
        onError: (error, ctx, networkDetails, stats) => {
          const idx = this._attempts.get(originalUrl) || 0;
          if (idx < proxyTemplates.length) {
            this._attempts.set(originalUrl, idx + 1);
            const tpl = proxyTemplates[idx];
            console.warn(`[HLS] 加载失败，切换出口 ${idx + 1}: ${originalUrl}`);
            ctx.url = buildProxiedUrl(tpl, originalUrl);
            super.load(ctx, config, callbacks);
          } else if (callbacks.onError) {
            callbacks.onError(error, ctx, networkDetails, stats);
          }
        },
      };
      super.load(context, config, wrappedCallbacks);
    }
  };
}

export function attachHls(video, sourceUrl, primaryProxyTemplate, { onError } = {}) {
  // 候选出口：用户设置的代理优先，其余预设依次兜底（限制数量避免总时长过长）
  const templates = PROXY_PRESETS.map((p) => p.template).filter(
    (t) => t && t !== primaryProxyTemplate
  ).slice(0, 2);
  const candidates = primaryProxyTemplate ? [primaryProxyTemplate, ...templates] : templates;
  return new Promise((resolve, reject) => {
    const hls = new Hls({
      loader: candidates.length ? createSmartLoader(candidates) : undefined,
      maxBufferLength: 30,
      // 快速失败：内部重试交给 SmartLoader 的出口切换，避免重复等待
      manifestLoadingMaxRetry: 0,
      levelLoadingMaxRetry: 0,
      fragLoadingMaxRetry: 1,
      manifestLoadingTimeOut: 10000,
      levelLoadingTimeOut: 10000,
      fragLoadingTimeOut: 20000,
    });
    hls.loadSource(sourceUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => resolve(hls));
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        hls.destroy();
        reject(new Error(
          data.type === 'networkError'
            ? `视频源无法加载（直连被 CORS 拦截且代理被 CDN 反盗链拦截）: ${data.details}`
            : `HLS 播放失败: ${data.details}`
        ));
      } else if (onError) {
        onError(data);
      }
    });
  });
}

export function isHlsSupported() {
  return Hls.isSupported();
}
