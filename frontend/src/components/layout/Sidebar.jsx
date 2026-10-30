import React from "react";
import { nav } from "../../constants/navigation.js";

export default function Sidebar({
  mobileNav,
  health,
  page,
  setPage,
  setMobileNav,
  keys,
}) {
  return (
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand">
        <span className="brand-mark">
          <span>R</span>
        </span>
        <span>
          REDIS<span className="brand-light"> EXPLORER</span>
          <small>REDIS LEARNING APP</small>
        </span>
      </div>
      <div className="connection">
        <span className={`pulse ${health ? "connected" : ""}`} />
        <div>
          <b>{health ? "Server reachable" : "Server unavailable"}</b>
          <small>
            {health ? "Redis connected" : "Check the Redis service"}
          </small>
        </div>
      </div>
      <nav>
        {nav.map((item) => (
          <div key={item.id}>
            {item.group && <div className="nav-group">{item.group}</div>}
            <button
              className={`nav-link ${page === item.id ? "active" : ""}`}
              onClick={() => {
                setPage(item.id);
                setMobileNav(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === "explorer" && (
                <span className="nav-count">{keys.length}</span>
              )}
            </button>
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="tip-card">
          <span className="tip-spark">TIP</span>
          <b>Follow one value.</b>
          <p>
            Watch it travel from a browser request into Redis, then back again.
          </p>
          <button onClick={() => setPage("learning")}>
            Learn Redis <span>↗</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
