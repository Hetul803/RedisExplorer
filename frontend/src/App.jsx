import React, { useCallback, useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const nav = [
  { id: 'overview', label: 'Request path', icon: '01', group: 'THE LAB' },
  { id: 'explorer', label: 'Key workbench', icon: '02' },
  { id: 'playground', label: 'Command console', icon: '03' },
  { id: 'cache', label: 'Cache experiment', icon: '04' },
  { id: 'learning', label: 'Field notes', icon: '05', group: 'REFERENCE' },
];
const types = [
  { id: 'string', name: 'Strings', description: 'Simple text, numbers, or serialized data', symbol: 'S', tint: 'mint' },
  { id: 'list', name: 'Lists', description: 'Ordered collections of values', symbol: 'L', tint: 'blue' },
  { id: 'set', name: 'Sets', description: 'Unique, unordered members', symbol: '∪', tint: 'violet' },
  { id: 'hash', name: 'Hashes', description: 'Field and value records', symbol: 'H', tint: 'amber' },
];
const starterCommands = ['SET greeting "Hello Redis"', 'GET greeting', 'LPUSH queue task-1', 'LRANGE queue 0 -1', 'SADD tags redis nosql', 'SMEMBERS tags', 'HSET user:1 name Ada', 'HGET user:1 name'];

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const prettify = (value) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);

function App() {
  const [page, setPage] = useState('overview');
  const [health, setHealth] = useState(false);
  const [keys, setKeys] = useState([]);
  const [metrics, setMetrics] = useState({ hits: 0, misses: 0, hitRatio: 0, averageHitMs: 0, averageMissMs: 0, recent: [], keyCount: 0 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState({ key: '', type: 'string', value: '', ttl: '' });
  const [command, setCommand] = useState('SET greeting "Hello Redis"');
  const [commandResult, setCommandResult] = useState(null);
  const [cacheTtl, setCacheTtl] = useState(60);
  const [cacheResult, setCacheResult] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [healthResult, keyResult, metricResult] = await Promise.all([api('/health'), api('/keys'), api('/metrics')]);
      setHealth(healthResult.connected); setKeys(keyResult.keys); setMetrics(metricResult);
    } catch { setHealth(false); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 5000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 3400); return () => clearTimeout(timer); }, [notice]);
  const filteredKeys = useMemo(() => keys.filter((item) => (filterType === 'all' || item.type === filterType) && item.key.toLowerCase().includes(search.toLowerCase())), [keys, filterType, search]);

  const submitKey = async (event) => {
    event?.preventDefault(); setBusy(true);
    try {
      let value = editor.value;
      if (editor.type === 'list' || editor.type === 'set' || editor.type === 'hash') { try { value = JSON.parse(editor.value); } catch { throw new Error(`Enter a valid JSON ${editor.type === 'hash' ? 'object' : 'array'}.`); } }
      const data = { key: editor.key.trim(), type: editor.type, value, ...(editor.ttl ? { ttl: Number(editor.ttl) } : {}) };
      await api(selected ? `/keys/${encodeURIComponent(selected.key)}` : '/keys', { method: selected ? 'PUT' : 'POST', body: JSON.stringify(data) });
      setNotice({ kind: 'success', text: selected ? 'Key updated successfully' : 'Key created successfully' }); setSelected(null); setEditor({ key: '', type: 'string', value: '', ttl: '' }); await refresh();
    } catch (error) { setNotice({ kind: 'error', text: error.message }); } finally { setBusy(false); }
  };
  const chooseKey = async (key) => { try { const data = await api(`/keys/${encodeURIComponent(key)}`); setSelected(data); setEditor({ key: data.key, type: data.type, value: data.type === 'string' ? data.value : JSON.stringify(data.value, null, 2), ttl: data.ttl >= 0 ? String(data.ttl) : '' }); setPage('explorer'); } catch (error) { setNotice({ kind: 'error', text: error.message }); } };
  const removeKey = async (key) => { try { await api(`/keys/${encodeURIComponent(key)}`, { method: 'DELETE' }); setNotice({ kind: 'success', text: `${key} deleted` }); if (selected?.key === key) { setSelected(null); setEditor({ key: '', type: 'string', value: '', ttl: '' }); } await refresh(); } catch (error) { setNotice({ kind: 'error', text: error.message }); } };
  const runCommand = async (event) => { event.preventDefault(); setBusy(true); try { const data = await api('/commands', { method: 'POST', body: JSON.stringify({ command }) }); setCommandResult({ ok: true, value: data.result }); await refresh(); } catch (error) { setCommandResult({ ok: false, value: error.message }); } finally { setBusy(false); } };
  const runCache = async () => { setBusy(true); try { const data = await api('/cache/demo', { method: 'POST', body: JSON.stringify({ ttl: Number(cacheTtl) }) }); setCacheResult(data); await refresh(); } catch (error) { setNotice({ kind: 'error', text: error.message }); } finally { setBusy(false); } };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><span>R</span></span><span>REDIS<span className="brand-light"> EXPLORER</span><small>DATABASES · FIELD LAB</small></span></div>
      <div className="connection"><span className={`pulse ${health ? 'connected' : ''}`} /><div><b>{health ? 'Server reachable' : 'Server unavailable'}</b><small>{health ? 'Redis · localhost:6379' : 'Check the Redis service'}</small></div></div>
      <nav>{nav.map((item) => <div key={item.id}>{item.group && <div className="nav-group">{item.group}</div>}<button className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false); }}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === 'explorer' && <span className="nav-count">{keys.length}</span>}</button></div>)}</nav>
      <div className="sidebar-bottom"><div className="tip-card"><span className="tip-spark">FIELD NOTE 01</span><b>Follow one value.</b><p>Watch it travel from a browser request into Redis, then back again.</p><button onClick={() => setPage('learning')}>Open field notes <span>↗</span></button></div><div className="profile"><div className="avatar">LO</div><div><b>Local lab</b><small>Student workspace</small></div></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>☰</button><div className="breadcrumbs"><span>REDIS EXPLORER</span><i>/</i><b>{nav.find((item) => item.id === page)?.label}</b></div><div className="topbar-right"><div className="live-indicator"><span /> {health ? 'Connected to local Redis' : 'Waiting for Redis'}</div><button className="icon-button" title="Refresh dashboard" onClick={refresh}>Refresh ↻</button></div></header>
      <section className="content-area">
        {page === 'overview' && <Overview keys={keys} metrics={metrics} health={health} onNavigate={setPage} onSelect={chooseKey} onRefresh={refresh} />}
        {page === 'explorer' && <Explorer keys={filteredKeys} allCount={keys.length} filterType={filterType} setFilterType={setFilterType} search={search} setSearch={setSearch} editor={editor} setEditor={setEditor} selected={selected} setSelected={setSelected} submitKey={submitKey} removeKey={removeKey} busy={busy} onSelect={chooseKey} />}
        {page === 'playground' && <Playground command={command} setCommand={setCommand} result={commandResult} run={runCommand} busy={busy} />}
        {page === 'cache' && <CacheLab metrics={metrics} ttl={cacheTtl} setTtl={setCacheTtl} result={cacheResult} run={runCache} busy={busy} />}
        {page === 'learning' && <Learning onTry={(cmd) => { setCommand(cmd); setPage('playground'); }} />}
      </section>
    </main>
    {notice && <div className={`toast ${notice.kind}`}><span>{notice.kind === 'success' ? '✓' : '!'}</span>{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Overview({ keys, metrics, health, onNavigate, onRefresh }) {
  const recent = metrics.recent || [];
  const hitMax = Math.max(1, ...recent.map((r) => r.durationMs));
  const hasKeys = keys.length > 0;
  const hasCachePair = metrics.hits > 0 && metrics.misses > 0;
  return <>
    <PageHeading eyebrow="FIELD GUIDE / 01 — REQUEST PATH" title="Follow a value into Redis." subtitle="Start with a key, trace the API call, then compare a cache miss with a cache hit." action={<button className="button button-dark" onClick={() => onNavigate('explorer')}>Create a key <span>→</span></button>} />
    <section className="panel request-map"><div className="map-heading"><div><span className="eyebrow">THE SYSTEM, IN FOUR STEPS</span><h2>Where does the data go?</h2></div><span className="map-caption">Local demonstration · real Redis requests</span></div>
      <div className="request-flow">
        <div className="flow-stop"><span className="stop-number">01</span><div className="stop-icon browser-icon">UI</div><b>Browser</b><small>You submit a command</small></div><div className="flow-arrow"><span>HTTP / JSON</span><i /></div>
        <div className="flow-stop"><span className="stop-number">02</span><div className="stop-icon api-icon">API</div><b>Express</b><small>Validates the request</small></div><div className="flow-arrow"><span>Redis command</span><i /></div>
        <div className="flow-stop"><span className="stop-number">03</span><div className="stop-icon redis-icon">R</div><b>Redis</b><small>Stores or returns a value</small></div><div className="flow-arrow return-arrow"><span>Result travels back</span><i /></div>
        <div className="flow-stop"><span className="stop-number">04</span><div className="stop-icon result-icon">↵</div><b>Response</b><small>Shown here with timing</small></div>
      </div>
    </section>
    <section className="panel walkthrough"><div className="walkthrough-title"><span className="eyebrow">A SHORT CLASSROOM DEMO</span><h2>Run the whole loop</h2><p>Each step changes the live database. You can inspect what happened as you go.</p></div><div className="walkthrough-steps">
      <WalkthroughStep number="1" state={health ? 'done' : 'waiting'} title="Connect to Redis" detail={health ? 'The API received PONG from localhost:6379.' : 'Start Redis, then refresh this page.'} button={health ? 'Connection confirmed' : 'Check connection'} onClick={onRefresh} />
      <WalkthroughStep number="2" state={hasKeys ? 'done' : 'next'} title="Write and inspect a key" detail={hasKeys ? `${metrics.keyCount ?? keys.length} key(s) currently live in the database.` : 'Create a string, list, set, or hash, then open it to inspect its type and TTL.'} button={hasKeys ? 'Browse keys' : 'Create first key'} onClick={() => onNavigate('explorer')} />
      <WalkthroughStep number="3" state={hasCachePair ? 'done' : 'next'} title="Miss once, hit next" detail={hasCachePair ? `So far: ${metrics.misses} miss(es), ${metrics.hits} hit(s).` : 'Fetch the sample item twice. First it comes from the source fixture; next it comes from Redis.'} button="Open cache experiment" onClick={() => onNavigate('cache')} />
    </div></section>
    <div className="stats-grid compact-stats">
      <article className="stat-card"><div className="stat-top"><span>Redis connection</span><span className={`status-dot ${health ? '' : 'offline'}`} /></div><div className="stat-value status-value">{health ? 'Online' : 'Offline'}</div><div className="stat-foot"><span className="muted">Endpoint</span><b>localhost:6379</b></div></article>
      <article className="stat-card"><div className="stat-top"><span>Keys in database</span><span className="stat-icon blue">KEYS</span></div><div className="stat-value">{metrics.keyCount ?? keys.length}</div><div className="stat-foot"><button className="text-link" onClick={() => onNavigate('explorer')}>Inspect the keyspace →</button></div></article>
      <article className="stat-card"><div className="stat-top"><span>Cache hit ratio</span><span className="stat-icon violet">%</span></div><div className="stat-value">{metrics.hitRatio || 0}<span className="stat-unit">%</span></div><div className="stat-foot"><span className="muted">{metrics.hits || 0} hits · {metrics.misses || 0} misses</span></div></article>
      <article className="stat-card"><div className="stat-top"><span>Data types in this lab</span><span className="stat-icon amber">04</span></div><div className="type-pills">{types.map((t) => <span className={`mini-type ${t.tint}`} key={t.id}>{t.symbol}</span>)}</div><div className="stat-foot"><span className="muted">String · List · Set · Hash</span></div></article>
    </div>
    <div className="dashboard-grid">
      <section className="panel performance-panel"><div className="panel-heading"><div><h2>Cache performance</h2><p>Measured from your actual requests</p></div><button className="subtle-button" onClick={() => onNavigate('cache')}>View details <span>↗</span></button></div><div className="chart-summary"><div><span className="chart-legend"><i className="legend-dot hit" /> Cache hit</span><strong>{metrics.averageHitMs || 0}<small> ms avg</small></strong></div><div><span className="chart-legend"><i className="legend-dot miss" /> Cache miss</span><strong>{metrics.averageMissMs || 0}<small> ms avg</small></strong></div><div className="chart-ratio"><span>Hit ratio</span><strong>{metrics.hitRatio || 0}%</strong></div></div>
        <div className="activity-chart" aria-label="Recent cache request response times">{recent.length ? recent.map((item, i) => <div key={`${item.at}-${i}`} className="chart-column"><div className={`bar ${item.hit ? 'bar-hit' : 'bar-miss'}`} style={{ height: `${Math.max(8, item.durationMs / hitMax * 100)}%` }} title={`${item.hit ? 'Hit' : 'Miss'} · ${item.durationMs} ms`} /><span>{i % 2 === 0 ? new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>) : <div className="chart-empty"><span>↗</span><b>Your cache requests will show up here</b><p>Run the cache demo to start collecting performance data.</p><button className="text-link" onClick={() => onNavigate('cache')}>Open Cache Lab →</button></div>}</div><div className="chart-footer"><span><i className="legend-dot hit" /> Hits</span><span><i className="legend-dot miss" /> Misses</span><span className="chart-unit">Response time · milliseconds</span></div>
      </section>
      <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent operations</h2><p>Successful actions in this session</p></div><button className="icon-button" onClick={() => onNavigate('explorer')}>↗</button></div><div className="recent-list">{(metrics.operations || []).slice(0, 5).length ? (metrics.operations || []).slice(0, 5).map((item, index) => <div className="operation-row" key={`${item.at}-${index}`}><span className={`operation-action ${item.action.includes('DELETE') ? 'amber' : item.action.includes('CACHE') ? 'violet' : item.action.includes('READ') || item.action.includes('GET') ? 'blue' : 'mint'}`}>{item.action}</span><span className="recent-key"><b>{item.key}</b><small>{new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span></div>) : <div className="empty-small"><span>↳</span><b>No operations yet</b><p>Your successful actions will appear here.</p><button className="text-link" onClick={() => onNavigate('playground')}>Try a command →</button></div>}</div><button className="view-all" onClick={() => onNavigate('playground')}>Open command playground <span>→</span></button></section>
    </div>
    <section className="panel structures-panel"><div className="panel-heading"><div><h2>Redis data structures</h2><p>Four ways to organize the data you store</p></div><button className="subtle-button" onClick={() => onNavigate('learning')}>Explore the guide <span>↗</span></button></div><div className="structures-grid">{types.map((type) => <button className="structure-card" key={type.id} onClick={() => onNavigate('explorer')}><span className={`structure-icon ${type.tint}`}>{type.symbol}</span><span className="structure-copy"><b>{type.name}</b><small>{type.description}</small></span><span className="structure-arrow">↗</span></button>)}</div></section>
  </>;
}

function WalkthroughStep({ number, state, title, detail, button, onClick }) {
  return <article className={`walk-step ${state}`}><span className="walk-number">{state === 'done' ? '✓' : number}</span><div className="walk-copy"><b>{title}</b><p>{detail}</p></div><button onClick={onClick}>{button}<span>→</span></button></article>;
}

function Explorer({ keys, allCount, filterType, setFilterType, search, setSearch, editor, setEditor, selected, setSelected, submitKey, removeKey, busy, onSelect }) {
  const isStructured = ['list','set','hash'].includes(editor.type);
  const reset = () => { setSelected(null); setEditor({ key: '', type: 'string', value: '', ttl: '' }); };
  return <>
    <PageHeading eyebrow="YOUR DATABASE" title="Data Explorer" subtitle="Create, inspect, and manage keys across your Redis data structures." action={<span className="page-badge">{allCount} {allCount === 1 ? 'key' : 'keys'}</span>} />
    <div className="explorer-layout"><section className="panel key-browser"><div className="browser-top"><div><h2>Keys</h2><p>{keys.length} shown</p></div><button className="button button-green small" onClick={reset}>＋ Add key</button></div><div className="search-box"><span>⌕</span><input placeholder="Search keys..." value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div><div className="filter-row"><button className={filterType === 'all' ? 'selected' : ''} onClick={() => setFilterType('all')}>All <span>{allCount}</span></button>{types.map((t) => <button key={t.id} className={filterType === t.id ? 'selected' : ''} onClick={() => setFilterType(t.id)}>{t.name}</button>)}</div><div className="key-list">{keys.length ? keys.map((item) => <button key={item.key} className={`key-row ${selected?.key === item.key ? 'picked' : ''}`} onClick={() => onSelect(item.key)}><span className={`key-symbol ${types.find((t) => t.id === item.type)?.tint || 'mint'}`}>{types.find((t) => t.id === item.type)?.symbol || '?'}</span><span className="key-row-copy"><b>{item.key}</b><small>{item.type} · {item.ttl === -1 ? 'no expiration' : item.ttl >= 0 ? `expires in ${item.ttl}s` : 'key'}</small></span><span className="row-arrow">›</span></button>) : <div className="empty-small"><span>⌕</span><b>{allCount ? 'No matching keys' : 'Your database is empty'}</b><p>{allCount ? 'Try a different search or filter.' : 'Create a key to get started.'}</p></div>}</div></section>
      <section className="panel editor-panel"><div className="editor-heading"><div><span className="eyebrow">{selected ? 'KEY DETAILS' : 'CREATE SOMETHING'}</span><h2>{selected ? 'Edit key' : 'New key'}</h2></div>{selected && <button className="delete-button" onClick={() => removeKey(selected.key)}>⌫ Delete key</button>}</div><form onSubmit={submitKey}><label className="field-label" htmlFor="key-name">Key name</label><div className="input-wrap"><input id="key-name" placeholder="e.g. user:profile:42" required value={editor.key} onChange={(e) => setEditor({ ...editor, key: e.target.value })} disabled={Boolean(selected)} /><span className="input-hint">max 128 chars</span></div><label className="field-label">Data type</label><div className="type-select-grid">{types.map((t) => <button type="button" key={t.id} disabled={Boolean(selected)} className={`type-select ${editor.type === t.id ? 'chosen' : ''}`} onClick={() => setEditor({ ...editor, type: t.id, value: t.id === 'hash' ? '{\n  "field": "value"\n}' : t.id === 'string' ? '' : '[\n  "item one",\n  "item two"\n]' })}><span className={`mini-type ${t.tint}`}>{t.symbol}</span>{t.name}{editor.type === t.id && <span className="check">✓</span>}</button>)}</div><label className="field-label" htmlFor="key-value">{editor.type === 'string' ? 'Value' : editor.type === 'hash' ? 'Fields and values (JSON object)' : 'Items (JSON array)'}</label><textarea id="key-value" className="value-editor" rows={editor.type === 'string' ? 3 : 6} placeholder={editor.type === 'string' ? 'Type something...' : editor.type === 'hash' ? '{\n  "name": "Ada"\n}' : '[\n  "first item",\n  "second item"\n]'} required value={editor.value} onChange={(e) => setEditor({ ...editor, value: e.target.value })} /><label className="field-label" htmlFor="key-ttl">Expiration <span className="optional">optional · blank removes expiration</span></label><div className="ttl-input"><input id="key-ttl" type="number" min="1" max="31536000" placeholder="No expiration" value={editor.ttl} onChange={(e) => setEditor({ ...editor, ttl: e.target.value })} /><span>seconds</span></div><div className="editor-actions"><button type="button" className="button button-light" onClick={reset}>Clear</button><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'Saving…' : selected ? 'Save changes' : 'Create key'} <span>→</span></button></div></form><div className="editor-note"><span>ⓘ</span><p>Keys are stored in your connected Redis database. Structured values use JSON in this editor.</p></div></section></div>
  </>;
}

function Playground({ command, setCommand, result, run, busy }) {
  return <><PageHeading eyebrow="TRY IT YOURSELF" title="Command Playground" subtitle="Run a small, safe set of Redis commands and see what comes back." action={<span className="page-badge green-badge"><i /> Safe mode on</span>} /><div className="playground-layout"><section className="panel terminal-panel"><div className="terminal-toolbar"><div className="terminal-dots"><i/><i/><i/></div><span>redis-cli <b>— connected to localhost:6379</b></span><span className="terminal-live"><i/> live</span></div><form onSubmit={run}><div className="terminal-prompt"><span>redis</span> <b>›</b><input autoComplete="off" spellCheck="false" value={command} onChange={(e) => setCommand(e.target.value)} aria-label="Redis command" /><button className="run-button" disabled={busy}>{busy ? 'Running…' : 'Run command'} <span>⌘ ↵</span></button></div></form>{result && <div className={`terminal-result ${result.ok ? '' : 'error-result'}`}><span>{result.ok ? '←' : '!'}</span><pre>{prettify(result.value)}</pre><button onClick={() => navigator.clipboard?.writeText(prettify(result.value))} title="Copy result">▢</button></div>}<div className="terminal-help"><span>↳</span> Commands execute against your local Redis database. Only approved commands are enabled.</div></section>
      <section className="panel command-guide"><div className="panel-heading"><div><h2>Quick reference</h2><p>Choose a command to try it out</p></div></div><div className="command-list">{starterCommands.map((item, index) => <button key={item} onClick={() => setCommand(item)}><span className={`command-kind ${['SET','GET','DEL'].includes(item.split(' ')[0]) ? 'mint' : item.startsWith('LPUSH') || item.startsWith('LRANGE') ? 'blue' : item.startsWith('S') ? 'violet' : 'amber'}`}>{item.split(' ')[0]}</span><code>{item}</code><span>＋</span></button>)}</div><div className="allowed-note"><span>✓</span><p><b>Safe by design</b><br/>Only 9 read and write commands are available. Server and configuration commands are blocked.</p></div></section>
    </div><section className="help-callout"><span>✳</span><div><b>New to the Redis CLI?</b><p>Start with <code>SET greeting "hello"</code> to store a value, then run <code>GET greeting</code> to read it back.</p></div><button onClick={() => setCommand('SET greeting "Hello Redis"')}>Load example ↗</button></section></>;
}

function CacheLab({ metrics, ttl, setTtl, result, run, busy }) {
  const total = metrics.hits + metrics.misses;
  return <><PageHeading eyebrow="SEE REDIS IN ACTION" title="Cache Lab" subtitle="Watch a real Redis cache turn a slower source lookup into a quick response." action={<span className="page-badge">Sample source · clearly labeled</span>} /><div className="cache-layout"><section className="panel cache-demo"><div className="demo-header"><span className="demo-icon">ϟ</span><div><span className="eyebrow">LIVE DEMONSTRATION</span><h2>Cache a sample catalog item</h2><p>First request reads the sample source; the next reads from Redis.</p></div></div><div className="flow-diagram"><div className="flow-node"><span>▤</span><b>Sample source</b><small>In-memory fixture</small></div><div className="flow-connector"><i/><span>first request</span></div><div className="flow-node redis-node"><span>⌁</span><b>Redis cache</b><small>TTL enabled</small></div><div className="flow-connector"><i/><span>next request</span></div><div className="flow-node"><span>◎</span><b>Your browser</b><small>Response + metrics</small></div></div><div className="cache-controls"><label htmlFor="cache-ttl">Cache expiration</label><div className="ttl-input"><input id="cache-ttl" type="number" min="1" max="3600" value={ttl} onChange={(e) => setTtl(e.target.value)} /><span>seconds</span></div><button className="button button-dark" onClick={run} disabled={busy}>{busy ? 'Loading…' : 'Fetch sample data'} <span>→</span></button></div><div className="source-label"><span>ⓘ</span>Source: an in-memory fixture. A 140 ms teaching pause makes the first/second request difference visible; this is not an external database benchmark.</div>{result && <div className={`cache-result ${result.cached ? 'cache-hit-result' : 'cache-miss-result'}`}><div className="cache-result-head"><span>{result.cached ? '✓ Cache hit' : '↘ Cache miss · fetched from sample source'}</span><b>{result.durationMs} ms</b></div><pre>{JSON.stringify(result.data, null, 2)}</pre><small>Cached for {result.ttl} seconds {result.cached ? 'remaining' : ''} · {result.data.source}</small></div>}</section>
      <section className="panel cache-stats"><div className="panel-heading"><div><h2>Cache observations</h2><p>Measured by the backend this session</p></div><span className="live-badge"><i/> Live</span></div><div className="hit-ring-wrap"><div className="hit-ring" style={{ '--ratio': `${metrics.hitRatio || 0}%` }}><div><b>{metrics.hitRatio || 0}%</b><small>hit ratio</small></div></div></div><div className="cache-counts"><div><span><i className="legend-dot hit"/>Cache hits</span><b>{metrics.hits || 0}</b></div><div><span><i className="legend-dot miss"/>Cache misses</span><b>{metrics.misses || 0}</b></div><div><span>Requests measured</span><b>{total}</b></div></div><div className="response-compare"><div><span>Avg. hit response</span><b>{metrics.averageHitMs || 0}<small> ms</small></b></div><div><span>Avg. miss response</span><b>{metrics.averageMissMs || 0}<small> ms</small></b></div></div></section></div><section className="cache-explainer"><span className="tip-spark">FIELD NOTE</span><div><b>Read the timings in context</b><p>A cache hit reads the value from Redis. On a miss, the API reads the labeled in-memory fixture and adds a 140 ms teaching pause. The chart shows measured API request duration, but the miss delay is deliberate, so these values are for understanding the flow rather than benchmarking a production source.</p></div></section></>;
}

function Learning({ onTry }) {
  const [open, setOpen] = useState('redis');
  const lessons = [
    { id: 'redis', n: '01', title: 'What is Redis?', tag: 'THE BASICS', body: <>Redis is an open-source, in-memory data store. It keeps data in memory so applications can read and write it with very low latency. You can use it as a database, cache, message broker, or streaming engine.</>, cmd: 'PING' },
    { id: 'nosql', n: '02', title: 'What does NoSQL mean?', tag: 'THE BASICS', body: <>NoSQL describes databases that don’t rely on the traditional relational table model. Redis is a key-value store: each value is addressed by a unique key, and values can use data structures beyond plain text.</>, cmd: 'SET course "Database systems"' },
    { id: 'structures', n: '03', title: 'Four data structures', tag: 'DATA MODEL', body: <><p><b>Strings</b> store text or numbers. <b>Lists</b> keep an ordered sequence. <b>Sets</b> contain unique members. <b>Hashes</b> group field-value pairs under one key.</p><div className="lesson-examples"><code>SET greeting hello</code><code>LPUSH queue task-1</code><code>SADD tags redis</code><code>HSET user:1 name Ada</code></div></>, cmd: 'HSET user:1 name Ada' },
    { id: 'crud', n: '04', title: 'CRUD with Redis', tag: 'OPERATIONS', body: <>CRUD stands for Create, Read, Update, and Delete. <code>SET</code> creates or updates a string, <code>GET</code> reads it, and <code>DEL</code> removes any key. Most Redis write commands create the key when it doesn’t exist.</>, cmd: 'SET learning:crud "Create · Read · Update · Delete"' },
    { id: 'cache', n: '05', title: 'Caching & expiration', tag: 'PERFORMANCE', body: <>A cache stores a copy of frequently used data in fast storage. Redis keys can expire automatically, which keeps stale data from living forever. Use the Cache Lab to measure actual hit and miss request times.</>, cmd: 'SET temporary "expires in 60 seconds"' },
  ];
  return <><PageHeading eyebrow="THE REDIS FIELD GUIDE" title="Learning Center" subtitle="Short lessons, practical examples, and the commands to try them yourself." action={<span className="page-badge green-badge">5 bite-sized lessons</span>} /><div className="learning-layout"><section className="panel lessons-panel"><div className="lesson-intro"><span className="intro-star">✳</span><div><b>Build a mental model, one step at a time.</b><p>Start with the idea, then run a real command in your connected Redis.</p></div></div>{lessons.map((lesson) => <article key={lesson.id} className={`lesson ${open === lesson.id ? 'lesson-open' : ''}`}><button className="lesson-toggle" onClick={() => setOpen(open === lesson.id ? '' : lesson.id)}><span className="lesson-number">{lesson.n}</span><span className="lesson-title"><small>{lesson.tag}</small><b>{lesson.title}</b></span><span className="lesson-chevron">{open === lesson.id ? '−' : '+'}</span></button>{open === lesson.id && <div className="lesson-body"><div>{lesson.body}</div><button className="button button-green small" onClick={() => onTry(lesson.cmd)}>Try in Playground <span>↗</span></button></div>}</article>)}</section><aside className="learning-aside"><section className="panel glossary"><div className="panel-heading"><div><h2>Redis, at a glance</h2><p>A few ideas worth keeping close</p></div></div><div className="glossary-list"><div><span className="glossary-icon mint">⌁</span><p><b>Key</b><small>A unique name you use to find a value</small></p></div><div><span className="glossary-icon blue">ϟ</span><p><b>In-memory</b><small>Data kept in RAM for fast access</small></p></div><div><span className="glossary-icon violet">⏱</span><p><b>TTL</b><small>Time to live — when a key expires</small></p></div><div><span className="glossary-icon amber">↔</span><p><b>CRUD</b><small>Create, Read, Update, Delete</small></p></div></div></section><div className="learning-prompt"><span>✳</span><b>Ready to experiment?</b><p>Open the playground and run your first Redis command.</p><button onClick={() => onTry('SET greeting "Hello Redis"')}>Open Playground <span>→</span></button></div></aside></div></>;
}

export default App;
