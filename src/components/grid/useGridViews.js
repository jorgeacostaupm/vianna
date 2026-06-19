import { useReducer, useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectSelectionOrderValues } from "@/store/features/dataframe";

const DEFAULT_LAYOUT = Object.freeze({
  w: 3,
  h: 4,
  xBase: 0,
  yOffset: null,
});

const initialState = Object.freeze({
  views: [],
  layout: [],
});

function normalizeWorkspace(workspace) {
  return {
    views: Array.isArray(workspace?.views) ? workspace.views : [],
    layout: Array.isArray(workspace?.layout) ? workspace.layout : [],
  };
}

function gridViewsReducer(state, action) {
  switch (action.type) {
    case "ADD_VIEW": {
      const { view, layoutItem, yOffset } = action.payload;
      return {
        views: [view, ...state.views],
        layout: [
          layoutItem,
          ...state.layout.map((item) => ({ ...item, y: item.y + yOffset })),
        ],
      };
    }

    case "REMOVE_VIEW": {
      const id = action.payload.id;
      return {
        views: state.views.filter((view) => view.id !== id),
        layout: state.layout.filter((item) => item.i !== id),
      };
    }

    case "SET_LAYOUT":
      return {
        ...state,
        layout: action.payload.layout,
      };

    case "UPDATE_VIEW":
      return {
        ...state,
        views: state.views.map((view) =>
          view.id === action.payload.id
            ? { ...view, ...action.payload.patch }
            : view,
        ),
      };

    case "RESET":
      return initialState;

    case "HYDRATE":
      return normalizeWorkspace(action.payload);

    default:
      return state;
  }
}

function createViewId(type) {
  if (typeof globalThis?.crypto?.randomUUID === "function") {
    return `${type}-${globalThis.crypto.randomUUID()}`;
  }
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveLayoutPreset(getLayoutPreset, type, defaultW, defaultH) {
  const registryPreset =
    typeof getLayoutPreset === "function" ? getLayoutPreset(type) : null;
  if (!registryPreset || typeof registryPreset !== "object") {
    return {
      ...DEFAULT_LAYOUT,
      w: defaultW,
      h: defaultH,
    };
  }

  return {
    ...DEFAULT_LAYOUT,
    w: defaultW,
    h: defaultH,
    ...registryPreset,
  };
}

export default function useGridViews(defaultW = 3, defaultH = 4, options = {}) {
  const {
    topOffsetRows = 0,
    leftOffsetCols = 0,
    totalCols = 12,
    getLayoutPreset,
    workspace,
    onWorkspaceChange,
  } = options;
  const isHydratingRef = useRef(false);
  const hasMountedRef = useRef(false);
  const [state, dispatch] = useReducer(
    gridViewsReducer,
    workspace,
    normalizeWorkspace,
  );
  const dfFilename = useSelector((s) => s.dataframe.filename);
  const hierFilename = useSelector((s) => s.metadata.filename);
  const selectionOrderValues = useSelector(selectSelectionOrderValues);

  const addView = useCallback(
    (type, props = {}) => {
      const id = createViewId(type);
      const sourceOrderValues = selectionOrderValues;
      const preset = resolveLayoutPreset(
        getLayoutPreset,
        type,
        defaultW,
        defaultH,
      );
      const xBase = Number.isFinite(preset.xBase) ? preset.xBase : 0;
      const yOffset = Number.isFinite(preset.yOffset)
        ? preset.yOffset
        : preset.h;
      const w = Number.isFinite(preset.w) ? preset.w : defaultW;
      const h = Number.isFinite(preset.h) ? preset.h : defaultH;

      const availableCols = Math.max(totalCols - leftOffsetCols, 1);
      const width = Math.min(w, availableCols);
      const desiredX = leftOffsetCols + xBase;
      const maxX = leftOffsetCols + Math.max(availableCols - width, 0);
      const x = Math.min(desiredX, maxX);

      dispatch({
        type: "ADD_VIEW",
        payload: {
          view: { id, type, sourceOrderValues, ...props },
          layoutItem: { i: id, x, y: topOffsetRows, w: width, h },
          yOffset,
        },
      });
    },
    [
      defaultH,
      defaultW,
      getLayoutPreset,
      leftOffsetCols,
      selectionOrderValues,
      topOffsetRows,
      totalCols,
    ],
  );

  const removeView = useCallback((id) => {
    dispatch({ type: "REMOVE_VIEW", payload: { id } });
  }, []);

  const updateView = useCallback((id, patch) => {
    dispatch({ type: "UPDATE_VIEW", payload: { id, patch } });
  }, []);

  const setLayout = useCallback((layout) => {
    dispatch({ type: "SET_LAYOUT", payload: { layout } });
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    dispatch({ type: "RESET" });
  }, [dfFilename, hierFilename]);

  useEffect(() => {
    isHydratingRef.current = true;
    dispatch({ type: "HYDRATE", payload: workspace });
  }, [workspace?.revision]);

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false;
      return;
    }

    onWorkspaceChange?.({
      views: state.views,
      layout: state.layout,
    });
  }, [onWorkspaceChange, state.layout, state.views]);

  return {
    views: state.views,
    layout: state.layout,
    setLayout,
    addView,
    removeView,
    updateView,
  };
}
