import React, { useEffect, useRef, useState } from "react";
import PageHeading from "../components/common/PageHeading.jsx";
import CommandResult from "../components/playground/CommandResult.jsx";
import {
  commandGroups,
  commandReference,
} from "../constants/commandReference.js";
import { prettify } from "../utils/format.js";
export default function Playground({
  examples,
  command,
  setCommand,
  entries,
  clearConsole,
  run,
  busy,
  unavailable,
}) {
  const [referenceOpen, setReferenceOpen] = useState(
    () => window.matchMedia("(min-width: 901px)").matches,
  );
  const [group, setGroup] = useState("Strings");
  const [selected, setSelected] = useState("SET");
  const [copyStatus, setCopyStatus] = useState("");
  const input = useRef(null),
    transcript = useRef(null),
    historyIndex = useRef(-1),
    draft = useRef("");
  const reference =
    commandReference.find((item) => item.name === selected) ||
    commandReference[0];
  useEffect(() => {
    const name = (command || "").trim().split(/\s+/)[0].toUpperCase();
    const item = commandReference.find((item) => item.name === name);
    if (item) {
      setGroup(item.group);
      setSelected(name);
    }
  }, [examples]);
  useEffect(() => {
    if (transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [entries, busy]);
  function load(value) {
    setCommand(value);
    historyIndex.current = -1;
    input.current?.focus();
  }
  function keydown(event) {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || !entries.length)
      return;
    event.preventDefault();
    if (historyIndex.current === -1) draft.current = command;
    const next =
      event.key === "ArrowUp"
        ? Math.min(historyIndex.current + 1, entries.length - 1)
        : Math.max(-1, historyIndex.current - 1);
    historyIndex.current = next;
    setCommand(
      next === -1 ? draft.current : entries[entries.length - 1 - next].command,
    );
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(prettify(value));
      setCopyStatus("Result copied.");
    } catch {
      setCopyStatus("Copy unavailable. Select the result text to copy.");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="REDIS CONSOLE"
        title="Commands"
        subtitle="Run a command, inspect the result, and explore the reference alongside it."
      />
      <div className="console-layout">
        <section className="panel console-panel">
          <div className="panel-heading">
            <div>
              <h2>Session console</h2>
              <p>Latest 50 results · preserved while switching pages</p>
            </div>
            <button
              className="text-link"
              disabled={busy || !entries.length}
              onClick={() => {
                clearConsole();
                historyIndex.current = -1;
                setCopyStatus(
                  "Console cleared. Database values are unchanged.",
                );
              }}
            >
              Clear console
            </button>
          </div>
          <div
            className="console-transcript"
            ref={transcript}
            tabIndex="0"
            aria-label="Command results"
          >
            {!entries.length && (
              <div className="console-welcome">
                <b>Your results appear here</b>
                <p>
                  Load an example from the reference, or enter a command below.
                </p>
              </div>
            )}
            {entries.map((entry) => (
              <article className="console-entry" key={entry.id}>
                <div className="console-entry-head">
                  <span
                    className={`operation-action ${entry.ok ? "mint" : "amber"}`}
                  >
                    {entry.ok ? "SUCCESS" : "ERROR"}
                  </span>
                  <time>{entry.at}</time>
                  <button
                    className="text-link"
                    onClick={() => copy(entry.value)}
                    aria-label={`Copy result for ${entry.command}`}
                  >
                    Copy result
                  </button>
                </div>
                <code className="console-command">› {entry.command}</code>
                <CommandResult entry={entry} />
              </article>
            ))}
            {busy && <p role="status">Running command…</p>}
          </div>
          <form
            className="console-form"
            onSubmit={(event) => {
              if (!command.trim() || busy || unavailable) {
                event.preventDefault();
                return;
              }
              historyIndex.current = -1;
              run(event);
            }}
          >
            <label htmlFor="redis-command">Command</label>
            <div className="console-input-row">
              <div className="input-wrap">
                <span className="console-prompt">›</span>
                <input
                  id="redis-command"
                  ref={input}
                  spellCheck="false"
                  autoComplete="off"
                  value={command}
                  disabled={busy}
                  onChange={(event) => {
                    historyIndex.current = -1;
                    setCommand(event.target.value);
                  }}
                  onKeyDown={keydown}
                />
              </div>
              <button
                className="button button-dark"
                disabled={busy || unavailable || !command.trim()}
              >
                {busy ? "Running…" : "Run →"}
              </button>
            </div>
            <p className="console-hint">
              Enter to run · ↑ / ↓ previous commands · Write commands change
              your database.
            </p>
          </form>
          <p className="console-feedback" role="status">
            {copyStatus}
          </p>
        </section>
        <details
          className="panel console-reference"
          open={referenceOpen}
          onToggle={(event) => setReferenceOpen(event.currentTarget.open)}
        >
          <summary>
            Command reference <span>Expand / collapse</span>
          </summary>
          <div className="reference-body">
            <label htmlFor="command-category">Category</label>
            <select
              id="command-category"
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
                setSelected(
                  commandReference.find(
                    (item) => item.group === event.target.value,
                  ).name,
                );
              }}
            >
              {commandGroups.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <div className="reference-commands">
              {commandReference
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    className={selected === item.name ? "selected" : ""}
                    aria-pressed={selected === item.name}
                    key={item.name}
                    onClick={() => setSelected(item.name)}
                  >
                    {item.name}
                  </button>
                ))}
            </div>
            <h2>{reference.name}</h2>
            <code className="reference-syntax">
              {reference.name} {reference.args}
            </code>
            <p className="reference-description">{reference.description}</p>
            <p className="console-hint">
              key: record name · field: hash property · value/member: content ·
              indexes and counts: integers. Brackets mark optional arguments; do
              not type the brackets.
            </p>
            <div className="reference-example">
              <span className="eyebrow">EXAMPLE</span>
              <pre>{reference.example}</pre>
              <button
                className="button button-light"
                onClick={() => load(reference.example)}
              >
                Load example →
              </button>
            </div>
            {examples?.length > 0 && (
              <details className="reference-lesson">
                <summary>Examples from your lesson</summary>
                {examples.map((example) => (
                  <button key={example} onClick={() => load(example)}>
                    {example}
                  </button>
                ))}
              </details>
            )}
            <details className="reference-limits">
              <summary>Supported commands and limits</summary>
              <p>
                All {commandReference.length} commands listed here are
                supported. Examples only load the input; you decide when to run.
                This console excludes administrative, scripting, blocking, and
                unrestricted scan commands. Argument and payload limits protect
                this teaching app.
              </p>
            </details>
          </div>
        </details>
      </div>
    </>
  );
}
