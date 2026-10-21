export const prettify = (value) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

export function friendlyKey(key = "") {
  const match = key.match(
    /^lab:[^:]+:(guided|custom)(?::(source|cache|history))?$/,
  );
  if (!match) return key;
  return `${match[1] === "guided" ? "Guided example" : "Your own sample"} · ${match[2] || "Cache Lab"}`;
}
