import React, { useEffect, useState } from "react";
import PageHeading from "../components/common/PageHeading.jsx";
import { api } from "../services/api.js";
function getSession() {
  let id = sessionStorage.getItem("redis-lab");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("redis-lab", id);
  }
  return id;
}
export default function CacheLab({ unavailable }) {
  const [session] = useState(getSession),
    [mode, setMode] = useState("guided"),
    [state, setState] = useState(null),
    [draft, setDraft] = useState(""),
    [ttl, setTtl] = useState(30),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const base = `/cache/experiment/${session}/${mode}`;
  useEffect(() => {
    let active = true;
    setState(null);
    setMessage("");
    api(`${base}/state`)
      .then((data) => {
        if (active) {
          setState(data);
          setDraft(JSON.stringify(data.source, null, 2));
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [base]);
  async function act(action, method, body) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await api(`${base}/${action}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setState(data);
      if (!state) setDraft(JSON.stringify(data.source, null, 2));
      setMessage(
        action === "source"
          ? "Source saved. The cached copy is unchanged."
          : action === "cache"
            ? "Cache cleared. Your next fetch will be a miss."
            : action === "stats"
              ? "Experiment statistics reset."
              : "Updated successfully.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  const history = state?.history || [],
    hits = history.filter((item) => item.hit).length;
  const disabled = busy || unavailable || !state;
  const source = (() => {
    try {
      return JSON.parse(draft);
    } catch {
      return {};
    }
  })();
  const stale =
    state?.cached &&
    JSON.stringify(state.cached) !== JSON.stringify(state.source);
  function save() {
    try {
      act("source", "PUT", { data: JSON.parse(draft) });
    } catch {
      setMessage("Enter valid JSON before saving.");
    }
  }
  function field(name, value) {
    setDraft(JSON.stringify({ ...source, [name]: value }, null, 2));
  }
  return (
    <>
      <PageHeading
        title="Cache Lab"
        eyebrow="LEARN BY COMPARING"
        subtitle="Save a source, fetch a cached copy, then see what happens when the source changes."
      />
      <div className="lab-toolbar">
        <div className="filter-row" role="group" aria-label="Experiment mode">
          {["guided", "custom"].map((value) => (
            <button
              key={value}
              aria-pressed={mode === value}
              disabled={busy}
              className={mode === value ? "selected" : ""}
              onClick={() => setMode(value)}
            >
              {value === "guided" ? "Guided example" : "Your own sample"}
            </button>
          ))}
        </div>
        <span className="page-badge">
          {stale
            ? "Cached copy is out of date"
            : state?.cached
              ? "Source and cache match"
              : "Ready for a cache miss"}
        </span>
      </div>
      <div className="lab-steps">
        <span>
          <b>1</b> Save your source
        </span>
        <span>
          <b>2</b> Fetch twice: miss, then hit
        </span>
        <span>
          <b>3</b> Change the source and compare
        </span>
      </div>
      <div className="lab-grid">
        <section className="panel lab-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SOURCE DATA</span>
              <h2>{mode === "guided" ? "Sample product" : "Your sample"}</h2>
            </div>
          </div>
          <p className="lab-description">
            Saving changes the source only. An existing cached copy stays
            unchanged.
          </p>
          {mode === "guided" ? (
            <div className="lab-fields">
              <label className="field-label" htmlFor="product-name">
                Product name
              </label>
              <input
                id="product-name"
                value={source.name || ""}
                onChange={(e) => field("name", e.target.value)}
              />
              <div className="lab-field-pair">
                <label>
                  Price
                  <input
                    type="number"
                    value={source.price ?? 0}
                    onChange={(e) => field("price", Number(e.target.value))}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    value={source.stock ?? 0}
                    onChange={(e) => field("stock", Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              <label className="field-label" htmlFor="source-json">
                JSON object · up to 8 KB
              </label>
              <textarea
                className="value-editor"
                id="source-json"
                rows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </>
          )}
          <div className="editor-actions">
            <button
              className="button button-dark"
              disabled={disabled}
              onClick={save}
            >
              Save source →
            </button>
          </div>
          <details className="command-detail">
            <summary>View saved source</summary>
            <pre className="lab-json">
              {JSON.stringify(state?.source, null, 2)}
            </pre>
          </details>
        </section>
        <section className="panel lab-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">REDIS CACHE</span>
              <h2>Cached copy</h2>
            </div>
            <span className="page-badge">
              {state?.ttl >= 0
                ? `${state.ttl}s at last check`
                : "No cached copy"}
            </span>
          </div>
          {state?.cached ? (
            <pre className="lab-json">
              {JSON.stringify(state.cached, null, 2)}
            </pre>
          ) : (
            <div className="lab-empty">
              <b>{state ? "Your cache is empty" : "Loading experiment…"}</b>
              <p>Fetch once to copy the saved source into Redis.</p>
            </div>
          )}
          {stale && (
            <p className="topic-tip">
              The source changed. Fetch still returns this older copy until you
              clear the cache or its TTL expires.
            </p>
          )}
          <div className="lab-fetch">
            <label htmlFor="experiment-ttl">
              Cache lifetime
              <div className="ttl-input">
                <input
                  id="experiment-ttl"
                  type="number"
                  min="1"
                  max="3600"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                />
                <span>seconds</span>
              </div>
            </label>
            <button
              className="button button-dark"
              disabled={disabled}
              onClick={() => act("fetch", "POST", { ttl: Number(ttl) })}
            >
              Fetch through cache →
            </button>
          </div>
          <div className="lab-secondary">
            <button
              className="button button-light"
              disabled={disabled}
              onClick={() => act("cache", "DELETE")}
            >
              Clear cache
            </button>
            <button
              className="text-link"
              disabled={busy || unavailable}
              onClick={() => act("state", "GET")}
            >
              Refresh status ↻
            </button>
          </div>
        </section>
      </div>
      <p className="lab-message" role="status">
        {busy ? "Working…" : message}
      </p>
      <section className="panel lab-card">
        <div className="panel-heading">
          <div>
            <h2>Request history</h2>
            <p>
              {hits} hits · {history.length - hits} misses ·{" "}
              {history.length ? Math.round((hits / history.length) * 100) : 0}%
              hit ratio
            </p>
          </div>
          <button
            className="text-link"
            disabled={disabled}
            onClick={() => act("stats", "DELETE")}
          >
            Reset statistics
          </button>
        </div>
        {history.length ? (
          <div className="lab-history">
            {history.map((item, index) => (
              <details className="command-detail" key={item.at + index}>
                <summary>
                  <span
                    className={`operation-action ${item.hit ? "mint" : "amber"}`}
                  >
                    {item.hit ? "CACHE HIT" : "CACHE MISS"}
                  </span>
                  <span>{new Date(item.at).toLocaleTimeString()}</span>
                  <b>{item.durationMs} ms</b>
                </summary>
                <pre className="lab-json">
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        ) : (
          <p className="lab-description">
            No requests yet. Fetch through cache to start comparing results.
          </p>
        )}
        <details className="lab-method">
          <summary>About these measurements</summary>
          <p>
            Source and cache are separate Redis-backed teaching records. There
            is no simulated delay, so timings are not an external database
            benchmark. This history contains the latest 50 requests; resetting
            it does not reset dashboard totals. Source records and history
            expire after 24 hours.
          </p>
        </details>
      </section>
    </>
  );
}
