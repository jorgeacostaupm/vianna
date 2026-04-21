import GridLayout, { WidthProvider } from "react-grid-layout";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/styles/modules/layout.module.css";
import { Layout } from "antd";
import useGridViews from "./useGridViews";
import { createViewRenderer } from "./ViewRegistry";
import { normalizeViewRegistry, resolveViewLayout } from "./viewDefinitions";

const ResponsiveGridLayout = WidthProvider(GridLayout);
const GRID_COLS = 24;
const LEFT_PANEL_ID = "__left-panel__";
const DEFAULT_LEFT_PANEL_LAYOUT = Object.freeze({
  w: 6,
  h: 8,
  minW: 4,
  maxW: 10,
  minH: 4,
});

function clampSize(value, min, max) {
  const normalizedMin = Math.max(1, min);
  if (!Number.isFinite(max)) {
    return Math.max(value, normalizedMin);
  }
  return Math.min(Math.max(value, normalizedMin), max);
}

function normalizeMainLayout(layoutItems, totalCols) {
  const normalizedTotalCols = Math.max(totalCols, 1);
  return layoutItems.map((item) => {
    const width = clampSize(item.w, 1, normalizedTotalCols);
    const maxX = Math.max(normalizedTotalCols - width, 0);
    const x = Math.min(Math.max(item.x, 0), maxX);
    return { ...item, x, w: width };
  });
}

export default function Grid({
  registry,
  panel,
  panelPlacement = "top",
  panelGridLayout,
  compactType = null,
}) {
  const normalizedRegistry = useMemo(
    () => normalizeViewRegistry(registry),
    [registry],
  );
  const hasTopPanel = Boolean(panel) && panelPlacement === "top";
  const hasLeftPanel = Boolean(panel) && panelPlacement === "left";
  const leftPanelBounds = {
    ...DEFAULT_LEFT_PANEL_LAYOUT,
    ...(panelGridLayout || {}),
  };
  const [leftPanelCols, setLeftPanelCols] = useState(
    clampSize(leftPanelBounds.w, leftPanelBounds.minW, leftPanelBounds.maxW),
  );
  const [leftPanelRows, setLeftPanelRows] = useState(
    clampSize(leftPanelBounds.h, leftPanelBounds.minH, leftPanelBounds.maxH),
  );

  useEffect(() => {
    setLeftPanelCols(
      clampSize(leftPanelBounds.w, leftPanelBounds.minW, leftPanelBounds.maxW),
    );
  }, [leftPanelBounds.maxW, leftPanelBounds.minW, leftPanelBounds.w]);

  useEffect(() => {
    setLeftPanelRows(
      clampSize(leftPanelBounds.h, leftPanelBounds.minH, leftPanelBounds.maxH),
    );
  }, [leftPanelBounds.h, leftPanelBounds.maxH, leftPanelBounds.minH]);

  const { views, layout, setLayout, addView, removeView } = useGridViews(
    10,
    4,
    {
      topOffsetRows: 0,
      leftOffsetCols: hasLeftPanel ? leftPanelCols : 0,
      totalCols: GRID_COLS,
      getLayoutPreset: (type) => resolveViewLayout(normalizedRegistry[type]),
    },
  );
  const panelNode = panel ? panel(addView) : null;
  const leftPanelLayout = useMemo(() => {
    const minW = Math.max(1, leftPanelBounds.minW);
    const maxW = Math.max(minW, leftPanelBounds.maxW ?? minW);
    const minH = Math.max(1, leftPanelBounds.minH);
    const maxH = Number.isFinite(leftPanelBounds.maxH)
      ? Math.max(minH, leftPanelBounds.maxH)
      : undefined;
    const width = clampSize(leftPanelCols, minW, maxW);
    const height = clampSize(leftPanelRows, minH, maxH);
    const layout = {
      i: LEFT_PANEL_ID,
      x: 0,
      y: 0,
      w: width,
      h: height,
      minW,
      maxW,
      minH,
      isDraggable: false,
      isResizable: true,
      resizeHandles: ["se"],
    };
    if (typeof maxH === "number") {
      layout.maxH = maxH;
    }
    return layout;
  }, [leftPanelBounds, leftPanelCols, leftPanelRows]);

  const renderView = createViewRenderer(normalizedRegistry, removeView);
  const handleLayoutChange = useCallback(
    (nextLayout) => {
      if (!hasLeftPanel) {
        setLayout(nextLayout);
        return;
      }

      const resizedPanel =
        nextLayout.find((item) => item.i === LEFT_PANEL_ID) || leftPanelLayout;
      const nextPanelCols = clampSize(
        resizedPanel.w,
        leftPanelLayout.minW,
        leftPanelLayout.maxW,
      );
      if (nextPanelCols !== leftPanelCols) {
        setLeftPanelCols(nextPanelCols);
      }
      const nextPanelRows = clampSize(
        resizedPanel.h,
        leftPanelLayout.minH,
        leftPanelLayout.maxH,
      );
      if (nextPanelRows !== leftPanelRows) {
        setLeftPanelRows(nextPanelRows);
      }

      const mainItems = nextLayout.filter((item) => item.i !== LEFT_PANEL_ID);
      setLayout(normalizeMainLayout(mainItems, GRID_COLS));
    },
    [hasLeftPanel, leftPanelCols, leftPanelLayout, leftPanelRows, setLayout],
  );

  return (
    <Layout
      className={[
        styles.fullScreenLayout,
        hasTopPanel ? styles.fullScreenLayoutTopPanel : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasTopPanel && (
        <div className={styles.topPanelShell}>
          <div className={styles.topPanelShellContent}>{panelNode}</div>
        </div>
      )}

      <div className={styles.gridWorkspace}>
        <div className={styles.gridWrapper}>
          <ResponsiveGridLayout
            className="layout"
            layout={hasLeftPanel ? [leftPanelLayout, ...layout] : layout}
            onLayoutChange={handleLayoutChange}
            cols={GRID_COLS}
            rowHeight={100}
            isDraggable={true}
            isResizable={true}
            draggableHandle=".drag-handle"
            compactType={compactType}
            containerPadding={[10, 10]}
          >
            {hasLeftPanel && (
              <div
                key={LEFT_PANEL_ID}
                className={`${styles.gridPanelItem} ${styles.gridSidebarItem} grid-sidebar-item`}
              >
                <div
                  className={`${styles.gridPanelContent} ${styles.gridSidebarContent}`}
                >
                  {panelNode}
                </div>
              </div>
            )}
            {views.map(renderView)}
          </ResponsiveGridLayout>
        </div>
      </div>
    </Layout>
  );
}
