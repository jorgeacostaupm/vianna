import React from "react";
import { useSelector } from "react-redux";
import {
  CheckSquareOutlined,
  DownloadOutlined,
  DragOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import LegendButton from "./LegendButton";
import { Bar } from "@/components/charts/ChartBar";
import { hierarchySelector } from "@/store/features/metadata";
import BarButton from "@/components/ui/BarButton";
import PopoverButton from "@/components/ui/PopoverButton";
import HierarchyViewSettings from "../tools/HierarchyViewSettings";
import buttonStyles from "@/styles/Buttons.module.css";
import styles from "@/styles/ChartBar.module.css";
import UndoRedoButtons from "@/components/Buttons/UndoRedoButtons";

function downloadHierarchy(hierarchy) {
  const meta = JSON.stringify(hierarchy, null, 2);
  const blob = new Blob([meta], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = href;
  downloadLink.download = "hierarchy.json";
  downloadLink.click();
}

export default function HierarchyBar({
  orientation,
  onOrientationChange,
  linkStyle = "smooth",
  onLinkStyleChange,
  viewConfig,
  onViewConfigChange,
  selectionMode = "none",
  onSelectionModeChange,
  hasNodes = false,
}) {
  const hierarchy = useSelector(hierarchySelector);
  const hierarchyFilename = useSelector((state) => state.metadata.filename);
  const hierarchyTitle = hierarchyFilename
    ? `Hierarchy Editor · ${hierarchyFilename}`
    : "Hierarchy Editor";
  const toggleSelectionMode = (mode) => {
    const nextMode = selectionMode === mode ? "none" : mode;
    onSelectionModeChange?.(nextMode);
  };

  return (
    <>
      <Bar title={hierarchyTitle} drag={false}>
        <UndoRedoButtons />
        <div className={styles.separator} />

        <BarButton
          title="Brush selection (B)"
          icon={<DragOutlined />}
          onClick={() => toggleSelectionMode("brush")}
          disabled={!hasNodes}
          ariaLabel="Brush selection mode"
          className={
            selectionMode === "brush"
              ? buttonStyles.barButton
              : buttonStyles.greyBarButton
          }
        />
        <BarButton
          title="Click selection (C)"
          icon={<CheckSquareOutlined />}
          onClick={() => toggleSelectionMode("click")}
          disabled={!hasNodes}
          ariaLabel="Click selection mode"
          className={
            selectionMode === "click"
              ? buttonStyles.barButton
              : buttonStyles.greyBarButton
          }
        />

        <div className={styles.separator} />

        <LegendButton />

        <BarButton
          title={"Download hierarchy"}
          onClick={() => downloadHierarchy(hierarchy)}
          icon={<DownloadOutlined />}
        />

        {/* <BarButton
          title={
            isHorizontal
              ? "Switch to vertical layout"
              : "Switch to horizontal layout"
          }
          onClick={() => onOrientationChange?.(nextOrientation)}
          icon={
            !isHorizontal ? <RotateLeftOutlined /> : <RotateRightOutlined />
          }
        />

        <BarButton
          title={`Link style: ${LINK_STYLE_LABELS[linkStyle] ?? LINK_STYLE_LABELS.smooth}. Click to switch to ${LINK_STYLE_LABELS[nextLinkStyle]}.`}
          onClick={() => onLinkStyleChange?.(nextLinkStyle)}
          icon={<SwapOutlined />}
        /> */}

        <PopoverButton
          icon={<SettingOutlined />}
          title={"Settings"}
          content={
            <HierarchyViewSettings
              orientation={orientation}
              onOrientationChange={onOrientationChange}
              linkStyle={linkStyle}
              onLinkStyleChange={onLinkStyleChange}
              viewConfig={viewConfig}
              onViewConfigChange={onViewConfigChange}
            />
          }
        />
      </Bar>
    </>
  );
}
