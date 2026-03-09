import GridLayout, { WidthProvider } from "react-grid-layout";
import { useState } from "react";
import styles from "@/styles/App.module.css";
import { Layout } from "antd";
import useNotification from "@/hooks/useNotification";
import useRootStyles from "@/hooks/useRootStyles";
import useGridViews from "./useGridViews";
import { createViewRenderer } from "./ViewRegistry";
import { APP_NAME } from "@/utils/Constants";

const ResponsiveGridLayout = WidthProvider(GridLayout);
const PANEL_LAYOUT_ID = "__analysis_sidebar_panel__";
const GRID_COLS = 24;

export default function Grid({
  registry,
  panel,
  setInit,
  componentName,
  panelPlacement = "top",
}) {
  const holder = useNotification();
  useRootStyles(setInit, APP_NAME + " - " + componentName);
  const isInlineLeftPanel = Boolean(panel) && panelPlacement === "left";
  const initialPanelRows =
    componentName === "Comparison" ? 10 : componentName === "Evolution" ? 6 : 4;
  const [panelLayout, setPanelLayout] = useState({
    i: PANEL_LAYOUT_ID,
    x: 0,
    y: 0,
    w: 4,
    h: initialPanelRows,
    minW: 1,
    maxW: 6,
    minH: 3,
    maxH: 16,
    isDraggable: false,
    isResizable: true,
  });

  const { views, layout, setLayout, addView, removeView } = useGridViews(
    10,
    4,
    {
      topOffsetRows: 0,
      leftOffsetCols: isInlineLeftPanel ? panelLayout.w : 0,
      totalCols: GRID_COLS,
    },
  );
  const panelNode = panel ? panel(addView) : null;

  const renderView = createViewRenderer(registry, removeView);
  const layoutWithPanel = isInlineLeftPanel ? [panelLayout, ...layout] : layout;

  const handleLayoutChange = (nextLayout) => {
    if (!isInlineLeftPanel) {
      setLayout(nextLayout);
      return;
    }

    const nextPanelLayout = nextLayout.find(
      (item) => item.i === PANEL_LAYOUT_ID,
    );
    if (nextPanelLayout) {
      setPanelLayout((prev) => ({
        ...prev,
        ...nextPanelLayout,
        i: PANEL_LAYOUT_ID,
        isDraggable: false,
        isResizable: true,
      }));
    }

    setLayout(nextLayout.filter((item) => item.i !== PANEL_LAYOUT_ID));
  };

  return (
    <>
      {holder}
      <Layout className={styles.fullScreenLayout}>
        {!isInlineLeftPanel && panelNode}
        <div className={styles.gridWrapper}>
          <ResponsiveGridLayout
            className="layout"
            layout={layoutWithPanel}
            onLayoutChange={handleLayoutChange}
            cols={GRID_COLS}
            rowHeight={100}
            draggableHandle=".drag-handle"
            containerPadding={[10, 10]}
          >
            {isInlineLeftPanel && (
              <div key={PANEL_LAYOUT_ID} className={styles.gridPanelItem}>
                <div className={styles.gridPanelContent}>{panelNode}</div>
              </div>
            )}
            {views.map(renderView)}
          </ResponsiveGridLayout>
        </div>
      </Layout>
    </>
  );
}
