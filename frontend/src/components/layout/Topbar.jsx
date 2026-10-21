import React from "react";
import { nav } from "../../constants/navigation.js";

export default function Topbar({
  mobileNav,
  setMobileNav,
  page,
  health,
  refresh,
}) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        aria-expanded={mobileNav}
        onClick={() => setMobileNav(!mobileNav)}
      >
        ☰
      </button>
      <div className="breadcrumbs">
        <span>REDIS EXPLORER</span>
        <i>/</i>
        <b>{nav.find((item) => item.id === page)?.label}</b>
      </div>
      <div className="topbar-right">
        <div className="live-indicator">
          <span /> {health ? "Connected to Redis" : "Waiting for Redis"}
        </div>
        <button
          className="icon-button"
          title="Refresh dashboard"
          onClick={refresh}
        >
          Refresh ↻
        </button>
      </div>
    </header>
  );
}
