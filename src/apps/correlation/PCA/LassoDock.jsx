import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input, Radio, Typography } from "antd";

import panelStyles from "@/styles/SettingsPanel.module.css";
import styles from "./LassoDock.module.css";

const { Text } = Typography;

const DOCK_WIDTH = 340;
const DOCK_GAP = 8;
const MIN_DOCK_WIDTH = 260;

export default function LassoDock({
  enabled,
  anchorRef,
  targetColumn,
  groups,
  activeGroupId,
  selectionMode,
  assignmentCountsByGroup,
  unassignedVisibleCount,
  unassignedGroupName,
  onStop,
  onSelectionModeChange,
  onAddGroup,
  onClearAssignments,
  onSetActiveGroup,
  onRenameGroup,
  onUnassignedGroupNameChange,
  onApplyToDataset,
  onDownload,
}) {
  const [position, setPosition] = useState(null);
  const dockRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const getViewContainer = () =>
      anchorRef?.current?.closest?.("[data-view-container]") || null;

    const updatePosition = () => {
      const viewContainer = getViewContainer();
      if (!viewContainer) {
        setPosition(null);
        return;
      }

      const viewRect = viewContainer.getBoundingClientRect();
      const viewBar = viewContainer.querySelector("[data-view-bar]");
      const barBottom = viewBar
        ? viewBar.getBoundingClientRect().bottom
        : viewRect.top + 52;

      const viewportHeight = window.innerHeight;
      const left = Math.round(viewRect.right + DOCK_GAP);
      const availableWidth = window.innerWidth - left - DOCK_GAP;
      const width = Math.max(
        MIN_DOCK_WIDTH,
        Math.min(DOCK_WIDTH, Math.round(availableWidth)),
      );

      const panelHeight = dockRef.current?.getBoundingClientRect().height || 420;
      const maxTop = Math.max(DOCK_GAP, viewportHeight - panelHeight - DOCK_GAP);
      const top = Math.min(
        maxTop,
        Math.max(DOCK_GAP, Math.round(barBottom + DOCK_GAP)),
      );

      setPosition({ top, left, width });
    };

    const viewContainer = getViewContainer();
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && viewContainer
        ? new ResizeObserver(() => updatePosition())
        : null;
    if (resizeObserver && viewContainer) {
      resizeObserver.observe(viewContainer);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [enabled, anchorRef, groups?.length]);

  const portalRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);

  if (!enabled || !portalRoot || !position) return null;

  return createPortal(
    <div
      ref={dockRef}
      className={styles.dock}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
    >
      <div className={styles.header}>
        <div>
          <div className={styles.title}>PCA Lasso Groups</div>
          <Text className={styles.helper}>Column: {targetColumn || "-"}</Text>
        </div>
        <Button size="small" danger onClick={onStop}>
          Stop
        </Button>
      </div>

      <div className={styles.section}>
        <Text className={styles.label}>Selection action</Text>
        <Radio.Group
          className={panelStyles.radioGroupCompact}
          optionType="button"
          buttonStyle="solid"
          size="small"
          value={selectionMode}
          onChange={(e) => onSelectionModeChange(e.target.value)}
        >
          <Radio.Button value="add">Add</Radio.Button>
          <Radio.Button value="remove">Remove</Radio.Button>
        </Radio.Group>
        <Text className={styles.helper}>
          Add assigns points to the active group. Remove unassigns points from
          the active group. Use right click to draw lasso, and left click +
          drag to pan. You can combine multiple consecutive selections.
        </Text>
      </div>

      <div className={styles.section}>
        <div className={styles.row}>
          <Button size="small" onClick={onAddGroup}>
            Add group
          </Button>
          <Button size="small" onClick={onClearAssignments}>
            Clear selection
          </Button>
        </div>

        {(groups || []).map((group) => (
          <div key={group.id} className={styles.rowStretch}>
            <Radio
              checked={activeGroupId === group.id}
              onChange={() => onSetActiveGroup(group.id)}
            />
            <Input
              size="small"
              value={group.name}
              onChange={(e) => onRenameGroup(group.id, e.target.value)}
              placeholder="Group name"
            />
            <Text className={styles.count}>n={assignmentCountsByGroup?.[group.id] || 0}</Text>
          </div>
        ))}

        <Text className={styles.helper}>
          n = points currently assigned to each group in this PCA view.
        </Text>
      </div>

      <div className={styles.section}>
        <Text className={styles.label}>Unassigned group name</Text>
        <Input
          size="small"
          value={unassignedGroupName}
          onChange={(e) => onUnassignedGroupNameChange(e.target.value)}
          placeholder="Unassigned"
        />
        <Text className={styles.helper}>
          Unassigned visible points: {unassignedVisibleCount || 0}
        </Text>
      </div>

      <div className={styles.section}>
        <div className={styles.row}>
          <Button size="small" type="primary" onClick={onApplyToDataset}>
            Save to dataset
          </Button>
          <Button size="small" onClick={onDownload}>
            Download CSV
          </Button>
        </div>
        <Text className={styles.helper}>
          Left click a point to toggle assignment. Right click starts lasso.
        </Text>
      </div>
    </div>,
    portalRoot,
  );
}
