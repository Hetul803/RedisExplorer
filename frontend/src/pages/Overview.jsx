import { friendlyKey } from '../utils/format.js';
import React from "react";
import PageHeading from "../components/common/PageHeading.jsx";
import { types } from "../constants/redis.js";

export default function Overview({
  keys,
  metrics,
  health,
  onNavigate,
  onRefresh,
}) {
  const recent = metrics.recent || [];
  const hitMax = Math.max(1, ...recent.map((r) => r.durationMs));
  return (
    <>
      <PageHeading
        eyebrow="REDIS EXPLORER"
        title="Dashboard"
        subtitle="View your database status, keys, and cache activity."
        action={
          <button
            className="button button-dark"
            onClick={() => onNavigate("explorer")}
          >
            Create a key <span>→</span>
          </button>
        }
      />
      <div className="stats-grid compact-stats">
        <article className="stat-card">
          <div className="stat-top">
            <span>Redis connection</span>
            <span className={`status-dot ${health ? "" : "offline"}`} />
          </div>
          <div className="stat-value status-value">
            {health ? "Online" : "Offline"}
          </div>
          <div className="stat-foot">
            <span className="muted">Database</span>
            <b>Configured Redis</b>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Keys in database</span>
            <span className="stat-icon blue">KEYS</span>
          </div>
          <div className="stat-value">{metrics.keyCount ?? keys.length}</div>
          <div className="stat-foot">
            <button
              className="text-link"
              onClick={() => onNavigate("explorer")}
            >
              Inspect the keyspace →
            </button>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Cache hit ratio</span>
            <span className="stat-icon violet">%</span>
          </div>
          <div className="stat-value">
            {metrics.hitRatio || 0}
            <span className="stat-unit">%</span>
          </div>
          <div className="stat-foot">
            <span className="muted">
              {metrics.hits || 0} hits · {metrics.misses || 0} misses
            </span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span>Data types in this lab</span>
            <span className="stat-icon amber">04</span>
          </div>
          <div className="type-pills">
            {types.map((t) => (
              <span className={`mini-type ${t.tint}`} key={t.id}>
                {t.symbol}
              </span>
            ))}
          </div>
          <div className="stat-foot">
            <span className="muted">String · List · Set · Hash</span>
          </div>
        </article>
      </div>
      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-heading">
            <div>
              <h2>Cache performance</h2>
              <p>Measured from your actual requests</p>
            </div>
            <button
              className="subtle-button"
              onClick={() => onNavigate("cache")}
            >
              View details <span>↗</span>
            </button>
          </div>
          <div className="chart-summary">
            <div>
              <span className="chart-legend">
                <i className="legend-dot hit" /> Cache hit
              </span>
              <strong>
                {metrics.averageHitMs || 0}
                <small> ms avg</small>
              </strong>
            </div>
            <div>
              <span className="chart-legend">
                <i className="legend-dot miss" /> Cache miss
              </span>
              <strong>
                {metrics.averageMissMs || 0}
                <small> ms avg</small>
              </strong>
            </div>
            <div className="chart-ratio">
              <span>Hit ratio</span>
              <strong>{metrics.hitRatio || 0}%</strong>
            </div>
          </div>
          <div
            className="activity-chart"
            aria-label="Recent cache request response times"
          >
            {recent.length ? (
              recent.map((item, i) => (
                <div key={`${item.at}-${i}`} className="chart-column">
                  <div
                    className={`bar ${item.hit ? "bar-hit" : "bar-miss"}`}
                    style={{
                      height: `${Math.max(8, (item.durationMs / hitMax) * 100)}%`,
                    }}
                    title={`${item.hit ? "Hit" : "Miss"} · ${item.durationMs} ms`}
                  />
                  <span>
                    {i % 2 === 0
                      ? new Date(item.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              ))
            ) : (
              <div className="chart-empty">
                <span>↗</span>
                <b>Your cache requests will show up here</b>
                <p>Run the cache demo to start collecting performance data.</p>
                <button
                  className="text-link"
                  onClick={() => onNavigate("cache")}
                >
                  Open Cache Lab →
                </button>
              </div>
            )}
          </div>
          <div className="chart-footer">
            <span>
              <i className="legend-dot hit" /> Hits
            </span>
            <span>
              <i className="legend-dot miss" /> Misses
            </span>
            <span className="chart-unit">Response time · milliseconds</span>
          </div>
        </section>
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent operations</h2>
              <p>Successful actions in this session</p>
            </div>
            <button
              className="icon-button"
              onClick={() => onNavigate("explorer")}
            >
              ↗
            </button>
          </div>
          <div className="recent-list">
            {(metrics.operations || []).slice(0, 5).length ? (
              (metrics.operations || []).slice(0, 5).map((item, index) => (
                <div className="operation-row" key={`${item.at}-${index}`}>
                  <span
                    className={`operation-action ${item.action.includes("DELETE") ? "amber" : item.action.includes("CACHE") ? "violet" : item.action.includes("READ") || item.action.includes("GET") ? "blue" : "mint"}`}
                  >
                    {item.action}
                  </span>
                  <span className="recent-key">
                    <b>{friendlyKey(item.key)}</b>
                    <small>
                      {new Date(item.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-small">
                <span>↳</span>
                <b>No operations yet</b>
                <p>Your successful actions will appear here.</p>
                <button
                  className="text-link"
                  onClick={() => onNavigate("playground")}
                >
                  Try a command →
                </button>
              </div>
            )}
          </div>
          <button className="view-all" onClick={() => onNavigate("playground")}>
            Open command playground <span>→</span>
          </button>
        </section>
      </div>
      <section className="panel structures-panel">
        <div className="panel-heading">
          <div>
            <h2>Redis data structures</h2>
            <p>Four ways to organize the data you store</p>
          </div>
          <button
            className="subtle-button"
            onClick={() => onNavigate("learning")}
          >
            Explore the guide <span>↗</span>
          </button>
        </div>
        <div className="structures-grid">
          {types.map((type) => (
            <button
              className="structure-card"
              key={type.id}
              onClick={() => onNavigate("explorer")}
            >
              <span className={`structure-icon ${type.tint}`}>
                {type.symbol}
              </span>
              <span className="structure-copy">
                <b>{type.name}</b>
                <small>{type.description}</small>
              </span>
              <span className="structure-arrow">↗</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
