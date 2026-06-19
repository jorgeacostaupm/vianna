import { Layout } from "antd";
import GridLayout, { WidthProvider } from "react-grid-layout";

import styles from "@/styles/modules/layout.module.css";
import useViewportRowHeight from "@/hooks/useViewportRowHeight";

const ResponsiveGridLayout = WidthProvider(GridLayout);

const DEFAULT_CONTAINER_PADDING = 10;

export default function SingleViewAppLayout({
  sidebar = null,
  viewKey,
  children,
  layout,
  containerPadding = DEFAULT_CONTAINER_PADDING,
  rowHeight: customRowHeight,
  ...gridProps
}) {
  const viewportRowHeight = useViewportRowHeight(containerPadding);
  const rowHeight =
    typeof customRowHeight === "number" ? customRowHeight : viewportRowHeight;
  const resolvedLayout = layout || [{ i: viewKey, x: 0, y: 0, w: 12, h: 1 }];

  return (
    <Layout className={styles.fullScreenLayout}>
      {sidebar}

      <div className={styles.mainAppContent}>
        <ResponsiveGridLayout
          className="layout"
          layout={resolvedLayout}
          cols={12}
          rowHeight={rowHeight}
          containerPadding={[containerPadding, containerPadding]}
          autoSize={false}
          isDraggable={false}
          isResizable={false}
          {...gridProps}
        >
          <div key={viewKey}>{children}</div>
        </ResponsiveGridLayout>
      </div>
    </Layout>
  );
}
