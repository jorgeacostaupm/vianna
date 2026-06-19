import React from "react";
import { useSelector } from "react-redux";
import {
  CheckSquareOutlined,
  DragOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import LegendButton from "./LegendButton";
import { Bar } from "@/components/charts/ChartBar";
import {
  AppButton,
  APP_BUTTON_PRESETS,
  APP_BUTTON_VARIANTS,
} from "@/components/buttons/core";
import PopoverButton from "@/components/buttons/ui/PopoverButton";
import HierarchyViewSettings from "../tools/HierarchyViewSettings";
import styles from "@/styles/ChartBar.module.css";
import UndoRedoButtons from "@/components/buttons/navio/UndoRedoButtons";

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

        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          tooltip="Brush selection (B)"
          icon={<DragOutlined />}
          onClick={() => toggleSelectionMode("brush")}
          disabled={!hasNodes}
          ariaLabel="Brush selection mode"
          variant={
            selectionMode === "brush"
              ? APP_BUTTON_VARIANTS.TOOLBAR
              : APP_BUTTON_VARIANTS.TOOLBAR_MUTED
          }
        />
        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          tooltip="Click selection (C)"
          icon={<CheckSquareOutlined />}
          onClick={() => toggleSelectionMode("click")}
          disabled={!hasNodes}
          ariaLabel="Click selection mode"
          variant={
            selectionMode === "click"
              ? APP_BUTTON_VARIANTS.TOOLBAR
              : APP_BUTTON_VARIANTS.TOOLBAR_MUTED
          }
        />

        <div className={styles.separator} />

        <LegendButton />

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
