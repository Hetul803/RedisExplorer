import React from "react";

export default function WalkthroughStep({
  number,
  state,
  title,
  detail,
  button,
  onClick,
}) {
  return (
    <article className={`walk-step ${state}`}>
      <span className="walk-number">{state === "done" ? "✓" : number}</span>
      <div className="walk-copy">
        <b>{title}</b>
        <p>{detail}</p>
      </div>
      <button onClick={onClick}>
        {button}
        <span>→</span>
      </button>
    </article>
  );
}
