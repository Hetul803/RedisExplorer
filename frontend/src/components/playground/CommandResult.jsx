import React from "react";
import { prettify } from "../../utils/format.js";
export default function CommandResult({ entry }) {
  const { value, ok, command } = entry;
  const name = command.trim().split(/\s+/)[0].toUpperCase();
  if (!ok)
    return (
      <div className="console-error">
        <p>{String(value)}</p>
        {String(value).includes("WRONGTYPE") && (
          <p>
            This command does not match the stored type. Use TYPE with the key,
            then GET for strings, LRANGE for lists, SMEMBERS for sets, or
            HGETALL for hashes.
          </p>
        )}
      </div>
    );
  if (value === null)
    return (
      <p className="console-empty">
        No value at this key, field, or position. <code>null</code>
      </p>
    );
  if (Array.isArray(value)) {
    if (!value.length)
      return (
        <p className="console-empty">
          Empty result <code>[]</code>
        </p>
      );
    if (name === "HGETALL" && value.length % 2 === 0)
      return (
        <table className="console-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: value.length / 2 }, (_, i) => (
              <tr key={i}>
                <td>{value[i * 2]}</td>
                <td>{prettify(value[i * 2 + 1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    return (
      <ol className="console-values">
        {value.map((item, i) => (
          <li key={i}>
            <pre>{item === null ? "null" : prettify(item)}</pre>
          </li>
        ))}
      </ol>
    );
  }
  if (typeof value === "object")
    return (
      <table className="console-table">
        <tbody>
          {Object.entries(value).map(([key, item]) => (
            <tr key={key}>
              <th>{key}</th>
              <td>{prettify(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <pre className="console-value">
      {value === "" ? "(empty string)" : String(value)}
    </pre>
  );
}
