import React from "react";

export default function Toast({ notice, onDismiss }) {
  if (!notice) return null;
  return (
    <div className={`toast ${notice.kind}`}>
      <span>{notice.kind === "success" ? "✓" : "!"}</span>
      {notice.text}
      <button onClick={onDismiss}>×</button>
    </div>
  );
}
