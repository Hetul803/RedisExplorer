import { friendlyKey } from '../utils/format.js';
import React from "react";
import PageHeading from "../components/common/PageHeading.jsx";
import { types } from "../constants/redis.js";

export default function Explorer({
  keys,
  cursor,
  loadMore,
  loadingMore,
  allCount,
  filterType,
  setFilterType,
  search,
  setSearch,
  editor,
  setEditor,
  selected,
  setSelected,
  submitKey,
  removeKey, removeAllKeys,
  busy,
  unavailable,
  onSelect,
}) {
  const reset = () => {
    setSelected(null);
    setEditor({ key: "", type: "string", value: "", ttl: "" });
  };
  return (
    <>
      <PageHeading
        eyebrow="YOUR DATABASE"
        title="Data Explorer"
        subtitle="Create, inspect, and manage keys across your Redis data structures."
        action={
          <span className="page-badge">
            {allCount} {allCount === 1 ? "key" : "keys"}
          </span>
        }
      />
      <div className="explorer-layout">
        <section className="panel key-browser">
          <div className="browser-top">
            <div>
              <h2>Keys</h2>
              <p>{keys.length} shown</p>
            </div>
            <button className="button button-green small" onClick={reset}>
              ＋ Add key
            </button>
          </div>
          <button className="delete-button delete-all" disabled={busy || unavailable || allCount===0} onClick={removeAllKeys}>Delete all keys</button>
          <div className="search-box">
            <span>⌕</span>
            <input
              aria-label="Search loaded keys"
              placeholder="Search loaded keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-row">
            <button
              className={filterType === "all" ? "selected" : ""}
              onClick={() => setFilterType("all")}
            >
              All <span>{allCount}</span>
            </button>
            {types.map((t) => (
              <button
                key={t.id}
                className={filterType === t.id ? "selected" : ""}
                onClick={() => setFilterType(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="key-list">
            {keys.length ? (
              keys.map((item) => (
                <button
                  disabled={busy || unavailable}
                  key={friendlyKey(item.key)}
                  className={`key-row ${selected?.key === item.key ? "picked" : ""}`}
                  onClick={() => onSelect(item.key)}
                >
                  <span
                    className={`key-symbol ${types.find((t) => t.id === item.type)?.tint || "mint"}`}
                  >
                    {types.find((t) => t.id === item.type)?.symbol || "?"}
                  </span>
                  <span className="key-row-copy">
                    <b>{friendlyKey(item.key)}</b>
                    <small>
                      {item.type} ·{" "}
                      {item.ttl === -1
                        ? "no expiration"
                        : item.ttl >= 0
                          ? `expires in ${item.ttl}s`
                          : "key"}
                    </small>
                  </span>
                  <span className="row-arrow">›</span>
                </button>
              ))
            ) : (
              <div className="empty-small">
                <span>⌕</span>
                <b>
                  {allCount ? "No matching keys" : "Your database is empty"}
                </b>
                <p>
                  {allCount
                    ? "Try a different search or filter."
                    : "Create a key to get started."}
                </p>
              </div>
            )}
          </div>
          {cursor !== "0" && (
            <button
              className="button button-light"
              onClick={loadMore}
              disabled={loadingMore || busy || unavailable}
            >
              {loadingMore ? "Loading…" : "Load more keys"}
            </button>
          )}
          <p className="list-note">
            Search and filters apply to loaded keys. Refresh to check for
            expired keys.
          </p>
        </section>
        <section className="panel editor-panel">
          <fieldset disabled={busy || unavailable} className="editor-fieldset">
            <div className="editor-heading">
              <div>
                <span className="eyebrow">
                  {selected ? "KEY DETAILS" : "CREATE SOMETHING"}
                </span>
                <h2>{selected ? "Edit key" : "New key"}</h2>
              </div>
              {selected && (
                <button
                  className="delete-button"
                  onClick={() => removeKey(selected.key)}
                >
                  ⌫ Delete key
                </button>
              )}
            </div>
            <form onSubmit={submitKey}>
              <label className="field-label" htmlFor="key-name">
                Key name
              </label>
              <div className="input-wrap">
                <input
                  id="key-name"
                  placeholder="e.g. user:profile:42"
                  required
                  value={editor.key}
                  onChange={(e) =>
                    setEditor({ ...editor, key: e.target.value })
                  }
                  disabled={Boolean(selected)}
                />
                <span className="input-hint">max 128 chars</span>
              </div>
              <label className="field-label">Data type</label>
              <div className="type-select-grid">
                {types.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    disabled={Boolean(selected)}
                    className={`type-select ${editor.type === t.id ? "chosen" : ""}`}
                    onClick={() =>
                      setEditor({
                        ...editor,
                        type: t.id,
                        value:
                          t.id === "hash"
                            ? '{\n  "field": "value"\n}'
                            : t.id === "string"
                              ? ""
                              : '[\n  "item one",\n  "item two"\n]',
                      })
                    }
                  >
                    <span className={`mini-type ${t.tint}`}>{t.symbol}</span>
                    {t.name}
                    {editor.type === t.id && <span className="check">✓</span>}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="key-value">
                {editor.type === "string"
                  ? "Value"
                  : editor.type === "hash"
                    ? "Fields and values (JSON object)"
                    : "Items (JSON array)"}
              </label>
              <textarea
                id="key-value"
                className="value-editor"
                rows={editor.type === "string" ? 3 : 6}
                placeholder={
                  editor.type === "string"
                    ? "Type something..."
                    : editor.type === "hash"
                      ? '{\n  "name": "Ada"\n}'
                      : '[\n  "first item",\n  "second item"\n]'
                }
                required={editor.type !== "string"}
                value={editor.value}
                onChange={(e) =>
                  setEditor({ ...editor, value: e.target.value })
                }
              />
              <label className="field-label" htmlFor="key-ttl">
                Expiration{" "}
                <span className="optional">
                  optional · blank removes expiration
                </span>
              </label>
              <div className="ttl-input">
                <input
                  id="key-ttl"
                  type="number"
                  min="1"
                  max="31536000"
                  placeholder="No expiration"
                  value={editor.ttl}
                  onChange={(e) =>
                    setEditor({ ...editor, ttl: e.target.value })
                  }
                />
                <span>seconds</span>
              </div>
              <div className="editor-actions">
                <button
                  type="button"
                  className="button button-light"
                  onClick={reset}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="button button-dark"
                  disabled={busy || unavailable}
                >
                  {busy ? "Saving…" : selected ? "Save changes" : "Create key"}{" "}
                  <span>→</span>
                </button>
              </div>
            </form>
            <div className="editor-note">
              <span>ⓘ</span>
              <p>
                Keys are stored in your connected Redis database. Structured
                values use JSON in this editor.
              </p>
            </div>
          </fieldset>
        </section>
      </div>
    </>
  );
}
