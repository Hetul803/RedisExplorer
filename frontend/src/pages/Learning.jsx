import React, { useState } from "react";
import PageHeading from "../components/common/PageHeading.jsx";
import { lessons } from "../constants/lessons.js";
const docs = [
  "develop/data-types/strings/",
  "develop/data-types/lists/",
  "develop/data-types/sets/",
  "develop/data-types/hashes/",
  "commands/expire/",
];
const explanations = {
  SET: "Creates or replaces a string value. The quoted text is one argument. Adding EX 30 makes the key expire after 30 seconds. A successful write returns OK.",
  GET: "Reads a string without changing it. Run the SET example first. A missing or expired key returns null; a key of another type produces a type error.",
  STRLEN:
    "Returns the length of the string in bytes. A missing key returns zero. Unicode text can use more than one byte per character.",
  INCR: "Adds one to an integer stored as a string and returns the new value. A missing key starts at zero. Run it repeatedly to see the counter increase.",
  EXISTS:
    "Returns 1 if this key exists, otherwise 0. This checks existence without reading the stored value.",
  RPUSH:
    "Adds values to the end of a list and returns its new length. Repeating the command appends more values; lists allow duplicates.",
  LRANGE:
    "Reads a slice of a list without removing anything. The end index is inclusive; 0 -1 reads the entire list.",
  LLEN: "Returns the number of list items. A missing list has length zero.",
  LPOP: "Removes and returns the first item. This changes the list. An empty or missing list returns null.",
  LINDEX:
    "Reads the item at a zero-based index without removing it. Index 0 is the first item; -1 is the last. Out-of-range indexes return null.",
  SADD: "Adds unique members to a set. The result is the number of newly added members, so adding the same member twice does not increase the size.",
  SMEMBERS:
    "Reads all members of the set. Their order is not guaranteed. An absent set returns an empty collection.",
  SCARD:
    "Returns the number of unique members. Compare it with the values you passed to SADD.",
  SISMEMBER:
    "Checks whether the named member belongs to this set. Returns 1 for yes and 0 for no.",
  SREM: "Removes a member and returns the number removed. Removing an absent member returns zero. Removing the last member deletes the key.",
  HSET: "Creates or replaces one field inside a hash. Other fields remain unchanged. Returns 1 for a new field and 0 for an updated field.",
  HGETALL:
    "Reads all fields and values in a hash. Run HSET first to create the sample record. An absent hash returns an empty result.",
  HINCRBY:
    "Changes an integer field by the specified amount. Here -1 decreases stock. A missing field starts at zero; a nonnumeric value produces an error.",
  HDEL: "Deletes the specified field without deleting other fields. Returns the number removed. Deleting the final field removes the hash key.",
  HEXISTS:
    "Checks for one field inside a hash. Returns 1 when present, otherwise 0.",
  TTL: "Reads remaining lifetime in seconds. -1 means the key has no expiration; -2 means it does not exist.",
  EXPIRE:
    "Sets a new lifetime on an existing key. Returns 1 if applied, or 0 when the key is absent. Run the SET example first.",
  PERSIST:
    "Removes the expiration while keeping the value. Returns 1 if an expiration was removed, otherwise 0.",
};
export default function Learning({ onTry }) {
  const [index, setIndex] = useState(() =>
    Math.min(
      lessons.length - 1,
      Math.max(0, Number(sessionStorage.getItem("learning-topic")) || 0),
    ),
  );
  const lesson = lessons[index];
  function move(next) {
    setIndex(next);
    sessionStorage.setItem("learning-topic", String(next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <>
      <PageHeading
        eyebrow={`LEARN REDIS / ${index + 1} OF ${lessons.length}`}
        title={lesson.title}
        subtitle="Read the idea, open a command, then try it in your database."
      />
      <section className="panel topic-panel">
        <div className="panel-heading">
          <h2>The idea</h2>
          <a
            className="text-link"
            href={`https://redis.io/docs/latest/${docs[index]}`}
            target="_blank"
            rel="noreferrer"
          >
            Learn more on Redis ↗
          </a>
        </div>
        <p className="topic-description">{lesson.description}</p>
        <div className="topic-tip">{lesson.tip}</div>
      </section>
      <section className="panel topic-panel">
        <div className="panel-heading">
          <div>
            <h2>Explore the commands</h2>
            <p>Expand an example for its behavior and expected result.</p>
          </div>
        </div>
        <div key={index}>
          {lesson.commands.map((command) => (
            <details className="command-detail" key={command}>
              <summary>
                <code>{command}</code>
                <span>Details</span>
              </summary>
              <div>
                <p>{explanations[command.split(" ")[0]]}</p>
                <button
                  className="button button-dark"
                  onClick={() => onTry(command, lesson.commands)}
                >
                  Try in Playground →
                </button>
                <small>Loads this command for you to review and run.</small>
              </div>
            </details>
          ))}
        </div>
      </section>
      <nav className="topic-pagination" aria-label="Learning topics">
        <button
          className="button button-light"
          disabled={index === 0}
          onClick={() => move(index - 1)}
        >
          ← Previous topic
        </button>
        <span>
          {index + 1} / {lessons.length}
        </span>
        <button
          className="button button-dark"
          disabled={index === lessons.length - 1}
          onClick={() => move(index + 1)}
        >
          Next topic →
        </button>
      </nav>
    </>
  );
}
