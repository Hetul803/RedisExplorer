import React, { createContext, useContext } from "react";
import { useRedisExplorer } from "../hooks/useRedisExplorer.js";

const RedisContext = createContext(null);
export function RedisProvider({ children }) {
  const store = useRedisExplorer();
  return (
    <RedisContext.Provider value={store}>{children}</RedisContext.Provider>
  );
}
export function useRedisStore() {
  const store = useContext(RedisContext);
  if (!store) throw new Error("useRedisStore requires RedisProvider");
  return store;
}
