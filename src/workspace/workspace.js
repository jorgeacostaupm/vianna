export const RESTORE_WORKSPACE_ACTION = "workspace/restore";

const WORKSPACE_VERSION = 1;
const DB_NAME = "vianna-workspace";
const STORE_NAME = "workspaces";
const AUTOSAVE_KEY = "autosave";
const AUTOSAVE_FALLBACK_KEY = "vianna.workspace.autosave";
const RESTORABLE_SLICES = [
  "main",
  "compare",
  "evolution",
  "correlation",
  "metadata",
  "dataframe",
];

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const getAppIdFromRoute = (route) => {
  const normalized = String(route || "").trim();
  if (!normalized || normalized === "#/" || normalized === "/") return null;
  const path = normalized.replace(/^#/, "").replace(/^\//, "");
  if (!path) return null;
  if (path === "overview") return "overview";
  if (path === "comparison") return "comparison";
  if (path === "correlation") return "correlation";
  if (path === "evolution") return "evolution";
  if (path === "hierarchy") return "hierarchy";
  if (path === "quarantine") return "quarantine";
  return null;
};

const resetRuntimeFlags = (state) => ({
  ...state,
  main: state.main
    ? {
        ...state.main,
        demoLoadStatus: "idle",
      }
    : state.main,
  dataframe: state.dataframe
    ? {
        ...state.dataframe,
        loadingDataUpload: false,
      }
    : state.dataframe,
  metadata: state.metadata
    ? {
        ...state.metadata,
        loadingHierarchy: false,
        loadingDescriptions: false,
      }
    : state.metadata,
});

export function createWorkspaceSnapshot(reduxState, route = null) {
  const state = resetRuntimeFlags(
    RESTORABLE_SLICES.reduce((snapshot, key) => {
      snapshot[key] = reduxState?.[key] ?? null;
      return snapshot;
    }, {}),
  );
  const openApps = [
    ...new Set(
      [
        ...(Array.isArray(state.main?.openApps) ? state.main.openApps : []),
        getAppIdFromRoute(route),
      ].filter(Boolean),
    ),
  ];
  if (state.main) {
    state.main = {
      ...state.main,
      openApps,
    };
  }

  return {
    version: WORKSPACE_VERSION,
    savedAt: new Date().toISOString(),
    route,
    openApps,
    assets: {
      dataFilename: state.dataframe?.filename ?? null,
      hierarchyFilename: state.metadata?.filename ?? null,
      descriptionsFilename: state.metadata?.descriptionsFilename ?? null,
      rowCount: safeArray(state.dataframe?.dataframe).length,
      nodeCount: safeArray(state.metadata?.attributes).length,
    },
    state,
  };
}

export function workspaceHasContent(workspace) {
  const state = workspace?.state;
  if (!state) return false;
  return (
    safeArray(state.dataframe?.dataframe).length > 0 ||
    safeArray(state.metadata?.attributes).length > 0 ||
    safeArray(state.compare?.workspace?.views).length > 0 ||
    safeArray(state.evolution?.workspace?.views).length > 0 ||
    safeArray(state.correlation?.workspace?.views).length > 0
  );
}

export function getWorkspaceSummary(workspace) {
  const assets = safeObject(workspace?.assets);
  return {
    savedAt: workspace?.savedAt ?? null,
    dataFilename: assets.dataFilename ?? null,
    hierarchyFilename: assets.hierarchyFilename ?? null,
    rowCount: assets.rowCount ?? 0,
    nodeCount: assets.nodeCount ?? 0,
  };
}

export function normalizeWorkspace(input) {
  const workspace = safeObject(input);
  const state = safeObject(workspace.state);
  const restoredState = RESTORABLE_SLICES.reduce((snapshot, key) => {
    if (state[key]) snapshot[key] = state[key];
    return snapshot;
  }, {});

  return {
    version: Number(workspace.version) || WORKSPACE_VERSION,
    savedAt: workspace.savedAt || null,
    route: typeof workspace.route === "string" ? workspace.route : null,
    openApps: Array.isArray(workspace.openApps) ? workspace.openApps : [],
    assets: safeObject(workspace.assets),
    state: restoredState,
  };
}

export function restoreWorkspace(workspace) {
  return {
    type: RESTORE_WORKSPACE_ACTION,
    payload: normalizeWorkspace(workspace),
  };
}

export function applyWorkspaceState(currentState, workspace) {
  const normalized = normalizeWorkspace(workspace);
  const nextState = {
    ...currentState,
    ...normalized.state,
  };

  if (currentState?.notifications) {
    nextState.notifications = currentState.notifications;
  }

  return nextState;
}

function openWorkspaceDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withWorkspaceStore(mode, callback) {
  const db = await openWorkspaceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function saveAutosaveWorkspace(workspace) {
  if (!workspaceHasContent(workspace)) return;

  try {
    await withWorkspaceStore("readwrite", (store) =>
      store.put(workspace, AUTOSAVE_KEY),
    );
  } catch {
    globalThis.localStorage?.setItem(
      AUTOSAVE_FALLBACK_KEY,
      JSON.stringify(workspace),
    );
  }
}

export async function loadAutosaveWorkspace() {
  try {
    const workspace = await withWorkspaceStore("readonly", (store) =>
      store.get(AUTOSAVE_KEY),
    );
    return workspaceHasContent(workspace) ? normalizeWorkspace(workspace) : null;
  } catch {
    const text = globalThis.localStorage?.getItem(AUTOSAVE_FALLBACK_KEY);
    if (!text) return null;
    const workspace = JSON.parse(text);
    return workspaceHasContent(workspace) ? normalizeWorkspace(workspace) : null;
  }
}

export async function readWorkspaceFile(file) {
  const text = await file.text();
  return normalizeWorkspace(JSON.parse(text));
}

export function downloadWorkspace(workspace, filename = "vianna-workspace.json") {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}
