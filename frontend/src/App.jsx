import DeleteDialog from "./components/common/DeleteDialog.jsx";
import React, { lazy, Suspense, useState } from "react";
import { useRedisStore } from "./store/RedisProvider.jsx";
const Overview = lazy(() => import("./pages/Overview.jsx"));
const Explorer = lazy(() => import("./pages/Explorer.jsx"));
const Playground = lazy(() => import("./pages/Playground.jsx"));
const CacheLab = lazy(() => import("./pages/CacheLab.jsx"));
const Learning = lazy(() => import("./pages/Learning.jsx"));
import Sidebar from "./components/layout/Sidebar.jsx";
import Topbar from "./components/layout/Topbar.jsx";
import Toast from "./components/common/Toast.jsx";

function App() {
  const [relatedCommands, setRelatedCommands] = useState(null);
  const {
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
    clearCommandLog,
    cacheTtl,
    setCacheTtl,
    cacheResult,
    mobileNav,
    setMobileNav,
    refresh,
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
    loading,
    connectionError,
    cursor,
    loadMore,
    loadingMore,
    resetCache,
  } = useRedisStore();

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <Sidebar {...{ mobileNav, health, page, setPage, setMobileNav, keys }} />
      <main className="main-area">
        <Topbar {...{ mobileNav, setMobileNav, page, health, refresh }} />
        <section className="content-area">
          {loading ? (
            <p role="status">Connecting to Redis…</p>
          ) : (
            connectionError && (
              <div className="connection-error" role="alert">
                {connectionError} Start Redis and the API, then{" "}
                <button onClick={refresh}>Retry connection</button>. Previously
                loaded data may be out of date.
              </div>
            )
          )}
          <Suspense fallback={<p role="status">Loading page…</p>}>
            {page === "overview" && (
              <Overview
                keys={keys}
                metrics={metrics}
                health={health}
                onNavigate={setPage}
                onSelect={chooseKey}
                onRefresh={refresh}
              />
            )}
            {page === "explorer" && (
              <Explorer
                keys={filteredKeys}
                allCount={metrics.keyCount ?? keys.length}
                cursor={cursor}
                loadMore={loadMore}
                loadingMore={loadingMore}
                filterType={filterType}
                setFilterType={setFilterType}
                search={search}
                setSearch={setSearch}
                editor={editor}
                setEditor={setEditor}
                selected={selected}
                setSelected={setSelected}
                submitKey={submitKey}
                removeKey={removeKey}
                removeAllKeys={removeAllKeys}
                busy={busy}
                unavailable={!health || loading}
                onSelect={chooseKey}
              />
            )}
            {page === "playground" && (
              <Playground
                examples={relatedCommands}
                command={command}
                setCommand={setCommand}
                entries={commandLog}
                clearConsole={clearCommandLog}
                run={runCommand}
                busy={busy}
                unavailable={!health || loading}
              />
            )}
            {page === "cache" && (
              <CacheLab
                metrics={metrics}
                ttl={cacheTtl}
                setTtl={setCacheTtl}
                result={cacheResult}
                run={runCache}
                reset={resetCache}
                busy={busy}
                unavailable={!health || loading}
              />
            )}
            {page === "learning" && (
              <Learning
                onTry={(cmd, examples) => {
                  setRelatedCommands(examples);
                  setCommand(cmd);
                  setPage("playground");
                }}
              />
            )}
          </Suspense>
        </section>
      </main>
      <DeleteDialog
        target={deleteTarget}
        busy={busy}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}

export default App;
