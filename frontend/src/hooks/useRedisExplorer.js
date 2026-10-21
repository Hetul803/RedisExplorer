import {
  REFRESH_INTERVAL_MS,
  NOTICE_DURATION_MS,
  DEFAULT_CACHE_TTL,
  EMPTY_EDITOR,
  INITIAL_METRICS,
} from "../constants/config.js";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { api } from "../services/api.js";

const pages = ["overview", "explorer", "playground", "cache", "learning"];
const currentPage = () =>
  pages.includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview";
export function useRedisExplorer() {
  const [page, updatePage] = useState(currentPage);
  const setPage = (next) => {
    location.hash = next;
    updatePage(next);
    setMobileNav(false);
  };
  useEffect(() => {
    const navigate = () => {
      updatePage(currentPage());
      setMobileNav(false);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  const [connectionError, setConnectionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState("0");
  const [loadingMore, setLoadingMore] = useState(false);
  const selectionRequest = useRef(0);
  const scanGeneration = useRef(0);
  const scanPending = useRef(false);
  const actionLock = useRef(false);
  const [health, setHealth] = useState(false);
  const [keys, setKeys] = useState([]);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState(EMPTY_EDITOR);
  const [command, setCommand] = useState('SET greeting "Hello Redis"');
  const [commandResult, setCommandResult] = useState(null);
  const [commandLog, setCommandLog] = useState([]);
  const [cacheTtl, setCacheTtl] = useState(DEFAULT_CACHE_TTL);
  const [cacheResult, setCacheResult] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const initialScan = useRef(true);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const pendingRefresh = useRef(null);
  const refresh = useCallback(() => {
    if (pendingRefresh.current) return pendingRefresh.current;
    pendingRefresh.current = (async () => {
      try {
        const [healthResult, keyResult, metricResult] = await Promise.all([
          api("/health"),
          initialScan.current ? api("/keys") : Promise.resolve(null),
          api("/metrics"),
        ]);
        setHealth(healthResult.connected);
        if (keyResult) {
          setKeys(keyResult.keys);
          setCursor(String(keyResult.cursor));
          initialScan.current = false;
        }
        setConnectionError(
          healthResult.connected ? "" : "Redis is unavailable.",
        );
        setMetrics(metricResult);
      } catch (error) {
        setConnectionError(error.message || "Cannot reach the API.");
        setHealth(false);
      } finally {
        pendingRefresh.current = null;
        setLoading(false);
      }
    })();
    return pendingRefresh.current;
  }, []);
  useEffect(() => {
    let stopped = false;
    let timer;
    const poll = async () => {
      clearTimeout(timer);
      if (document.hidden || stopped) return;
      await refresh();
      if (!stopped && !document.hidden)
        timer = setTimeout(poll, REFRESH_INTERVAL_MS);
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) poll();
    };
    poll();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  const filteredKeys = useMemo(
    () =>
      keys.filter(
        (item) =>
          (filterType === "all" || item.type === filterType) &&
          item.key.toLowerCase().includes(search.toLowerCase()),
      ),
    [keys, filterType, search],
  );

  const reload = async () => {
    await pendingRefresh.current;
    scanGeneration.current++;
    initialScan.current = true;
    return refresh();
  };
  const loadMore = async () => {
    if (scanPending.current || cursor === "0") return;
    scanPending.current = true;
    const generation = scanGeneration.current;
    setLoadingMore(true);
    try {
      const result = await api(`/keys?cursor=${encodeURIComponent(cursor)}`);
      if (generation !== scanGeneration.current) return;
      setKeys((previous) => [
        ...new Map(
          [...previous, ...result.keys].map((item) => [item.key, item]),
        ).values(),
      ]);
      setCursor(String(result.cursor));
    } catch (error) {
      setNotice({ kind: "error", text: error.message });
    } finally {
      scanPending.current = false;
      setLoadingMore(false);
    }
  };
  const resetCache = async () => {
    if (actionLock.current || !health) return;
    actionLock.current = true;
    setBusy(true);
    try {
      await api("/cache/demo", { method: "DELETE" });
      setCacheResult(null);
      setNotice({
        kind: "success",
        text: "Demo cache cleared. The next fetch will be a miss.",
      });
      await reload();
    } catch (error) {
      setNotice({ kind: "error", text: error.message });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const submitKey = async (event) => {
    event?.preventDefault();
    if (actionLock.current || !health) return;
    actionLock.current = true;
    setBusy(true);
    try {
      let value = editor.value;
      if (
        editor.type === "list" ||
        editor.type === "set" ||
        editor.type === "hash"
      ) {
        try {
          value = JSON.parse(editor.value);
        } catch {
          throw new Error(
            `Enter a valid JSON ${editor.type === "hash" ? "object" : "array"}.`,
          );
        }
      }
      const data = {
        key: editor.key.trim(),
        type: editor.type,
        value,
        ...(editor.ttl ? { ttl: Number(editor.ttl) } : {}),
      };
      await api(
        selected ? `/keys/${encodeURIComponent(selected.key)}` : "/keys",
        { method: selected ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      setNotice({
        kind: "success",
        text: selected
          ? "Key updated successfully"
          : "Key created successfully",
      });
      setSelected(null);
      setEditor(EMPTY_EDITOR);
      await reload();
    } catch (error) {
      if (error.status === 404) setSelected(null);
      setNotice({ kind: "error", text: error.message });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const chooseKey = async (key) => {
    if (actionLock.current || !health) return;
    const requestId = ++selectionRequest.current;
    try {
      const data = await api(`/keys/${encodeURIComponent(key)}`);
      if (requestId !== selectionRequest.current) return;
      setSelected(data);
      setEditor({
        key: data.key,
        type: data.type,
        value:
          data.type === "string"
            ? data.value
            : JSON.stringify(data.value, null, 2),
        ttl: data.ttl >= 0 ? String(data.ttl) : "",
      });
    } catch (error) {
      if (error.status === 404) setSelected(null);
      setNotice({ kind: "error", text: error.message });
    }
  };
  const removeKey = (key) => {
    setDeleteError("");
    setDeleteTarget({ key });
  };
  const removeAllKeys = () => {
    setDeleteError("");
    setDeleteTarget({ all: true });
  };
  const cancelDelete = () => {
    if (!actionLock.current) setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (actionLock.current || !health || !deleteTarget) return;
    actionLock.current = true;
    setBusy(true);
    setDeleteError("");
    try {
      if (deleteTarget.all)
        await api("/keys", {
          method: "DELETE",
          body: JSON.stringify({ confirmation: "DELETE ALL" }),
        });
      else
        await api(`/keys/${encodeURIComponent(deleteTarget.key)}`, {
          method: "DELETE",
        });
      if (deleteTarget.all || selected?.key === deleteTarget.key) {
        setSelected(null);
        setEditor(EMPTY_EDITOR);
      }
      if (deleteTarget.all) {
        setKeys([]);
        setCacheResult(null);
      }
      setNotice({
        kind: "success",
        text: deleteTarget.all
          ? "All keys deleted from the connected database."
          : "Key deleted.",
      });
      setDeleteTarget(null);
      await reload();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const runCommand = async (event) => {
    event.preventDefault();
    if (actionLock.current || !health) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const data = await api("/commands", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
      setCommandResult({ ok: true, value: data.result });
      setCommandLog((previous) =>
        [
          ...previous,
          {
            id: crypto.randomUUID(),
            command,
            ok: true,
            value: data.result,
            at: new Date().toLocaleTimeString(),
          },
        ].slice(-50),
      );
      await reload();
    } catch (error) {
      setCommandResult({ ok: false, value: error.message });
      setCommandLog((previous) =>
        [
          ...previous,
          {
            id: crypto.randomUUID(),
            command,
            ok: false,
            value: error.message,
            at: new Date().toLocaleTimeString(),
          },
        ].slice(-50),
      );
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };
  const runCache = async () => {
    if (actionLock.current || !health) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const data = await api("/cache/demo", {
        method: "POST",
        body: JSON.stringify({ ttl: Number(cacheTtl) }),
      });
      setCacheResult(data);
      await reload();
    } catch (error) {
      if (error.status === 404) setSelected(null);
      setNotice({ kind: "error", text: error.message });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  return {
    page,
    setPage,
    health,
    keys,
    metrics,
    busy,
    notice,
    setNotice,
    selected,
    setSelected,
    filterType,
    setFilterType,
    search,
    setSearch,
    editor,
    setEditor,
    command,
    setCommand,
    commandResult,
    commandLog,
    clearCommandLog: () => setCommandLog([]),
    cacheTtl,
    setCacheTtl,
    cacheResult,
    mobileNav,
    setMobileNav,
    refresh: reload,
    loading,
    connectionError,
    cursor,
    loadMore,
    loadingMore,
    resetCache,
    filteredKeys,
    submitKey,
    chooseKey,
    removeKey,
    removeAllKeys,
    deleteTarget,
    deleteError,
    cancelDelete,
    confirmDelete,
    runCommand,
    runCache,
  };
}
