import { useState } from 'react';
import { useApp, navigate } from '../app-context.jsx';
import { validateRule } from '../lib/engine.js';

const RULE_FIELDS = [
  ['name', '规则名称（唯一标识）'],
  ['baseURL', '站点首页 URL'],
  ['searchURL', '搜索 URL（含 @keyword）'],
  ['searchList', '搜索列表选择器'],
  ['searchName', '标题选择器'],
  ['searchResult', '详情链接选择器'],
  ['chapterRoads', '线路分组选择器'],
  ['chapterResult', '分集链接选择器'],
  ['referer', 'Referer（可选）'],
  ['userAgent', 'User-Agent（可选）'],
];

export default function Rules() {
  const { rules, toggleRule, removeRule, upsertRule, enabledRules, showToast } = useApp();
  const [editing, setEditing] = useState(null); // null | 'new' | ruleName
  const [draft, setDraft] = useState({});
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const openEdit = (rule) => { setDraft({ ...rule }); setEditing(rule.name); };
  const openNew = () => { setDraft({ name: '', baseURL: 'https://', searchURL: '', searchList: '', searchName: '', searchResult: '', chapterRoads: '', chapterResult: '' }); setEditing('new'); };

  const save = () => {
    const errors = validateRule(draft);
    if (errors.length) { showToast(errors[0]); return; }
    upsertRule(draft);
    setEditing(null);
    showToast('规则已保存');
  };

  const doImport = () => {
    try {
      let arr;
      const text = importText.trim();
      if (text.startsWith('[')) arr = JSON.parse(text);
      else if (text.startsWith('{')) arr = [JSON.parse(text)];
      else throw new Error('不是合法的 JSON');
      let ok = 0, fail = 0;
      for (const r of arr) {
        if (!validateRule(r).length) { upsertRule(r); ok++; } else fail++;
      }
      showToast(`导入完成: 成功 ${ok} 条${fail ? `，失败 ${fail} 条` : ''}`);
      setShowImport(false); setImportText('');
    } catch (e) {
      showToast(`导入失败: ${e.message}`);
    }
  };

  const importFromKazumiRules = async () => {
    setShowImport(true);
    setImportText('正在从 KazumiRules 仓库拉取最新规则…');
    try {
      const idx = await fetch('https://api.github.com/repos/Predidit/KazumiRules/contents').then((r) => r.json());
      const jsons = idx.filter((f) => f.name.endsWith('.json') && f.name !== 'index.json').map((f) => f.name);
      const all = await Promise.all(jsons.map((f) =>
        fetch(`https://raw.githubusercontent.com/Predidit/KazumiRules/main/${f}`).then((r) => r.json()).catch(() => null)
      ));
      const valid = all.filter((r) => r && r.type === 'anime' && !r.deprecated && !validateRule(r).length);
      setImportText(JSON.stringify(valid, null, 2));
    } catch (e) {
      setImportText(`// 拉取失败: ${e.message}\n// 可手动粘贴规则 JSON`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <h2 className="page-title" style={{ margin: 0, flex: 1 }}>规则管理（{enabledRules.length}/{rules.length} 启用）</h2>
        <button className="btn outline" onClick={importFromKazumiRules}>从 KazumiRules 导入</button>
        <button className="btn outline" onClick={() => setShowImport(true)}>粘贴 JSON</button>
        <button className="btn" onClick={openNew}>+ 新建规则</button>
      </div>

      {rules.map((r) => (
        <div className="row" key={r.name}>
          <label className="switch">
            <input type="checkbox" checked={r.enabled !== false} onChange={() => toggleRule(r.name)} />
            <span className="track" />
          </label>
          <div className="grow">
            <div className="title">{r.name} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--on-surface-var)' }}>v{r.version || '1.0'}</span></div>
            <div className="sub">{r.baseURL}{r.adBlocker ? ' · 广告过滤' : ''}{r.antiCrawlerConfig?.enabled ? ' · 反爬验证' : ''}</div>
          </div>
          <button className="btn sm tonal" onClick={() => openEdit(r)}>编辑</button>
          <button className="btn sm danger" onClick={() => { removeRule(r.name); showToast(`已删除规则 ${r.name}`); }}>删除</button>
        </div>
      ))}

      {editing && (
        <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <h3>{editing === 'new' ? '新建规则' : `编辑规则: ${editing}`}</h3>
            {RULE_FIELDS.map(([k, label]) => (
              <div className="form-item" key={k}>
                <label>{label}</label>
                <input className="input" value={draft[k] || ''} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </div>
            ))}
            <p style={{ fontSize: 12, color: 'var(--on-surface-var)' }}>
              选择器语法: XPath（以 // 开头）。分集选择器以线路节点为上下文，可使用 .// 相对路径。完整教程见
              <a href="https://kazumi.app/docs/rules/develop-rules" target="_blank" style={{ color: 'var(--primary)' }}> Kazumi 规则开发文档</a>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn outline" onClick={() => setEditing(null)}>取消</button>
              <button className="btn" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal">
            <h3>导入规则</h3>
            <p style={{ fontSize: 13, color: 'var(--on-surface-var)', marginTop: 0 }}>
              支持单个 JSON 对象或数组。与官方 Kazumi 规则格式完全兼容（api 型规则暂不支持，将自动过滤）。
            </p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"name":"示例","baseURL":"https://…","searchURL":"…@keyword…", …}' />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn outline" onClick={() => setShowImport(false)}>取消</button>
              <button className="btn" onClick={doImport}>导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
