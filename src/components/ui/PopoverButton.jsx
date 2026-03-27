import React, { useState, useEffect, useCallback, useRef } from "react";
import { Popover, Button, Tooltip } from "antd";
import styles from "./PopoverButton.module.css";
import { getViewOverlayPosition } from "./popupPosition";

export default function PopoverButton({
  content,
  icon,
  title,
  placement = "bottomRight",
  tooltipDuration = 1500,
  panelWidth,
}) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState(undefined);
  const [isFixedOverlay, setIsFixedOverlay] = useState(false);
  const triggerRef = useRef(null);

  const showTooltip = () => setTooltipVisible(true);

  useEffect(() => {
    let timer;
    if (tooltipVisible) {
      timer = setTimeout(() => setTooltipVisible(false), tooltipDuration);
    }
    return () => clearTimeout(timer);
  }, [tooltipVisible, tooltipDuration]);

  const updateOverlayPosition = useCallback(() => {
    const position = getViewOverlayPosition(triggerRef.current);
    setOverlayStyle(position || undefined);
    setIsFixedOverlay(Boolean(position));
  }, []);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) updateOverlayPosition();
    setOpen(nextOpen);
    if (nextOpen) setTooltipVisible(false);
  };

  useEffect(() => {
    if (!open || !isFixedOverlay) return undefined;

    const updatePosition = () => updateOverlayPosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isFixedOverlay, updateOverlayPosition]);

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      arrow={false}
      content={
        <div className={styles.panel} style={panelWidth ? { width: panelWidth } : undefined}>
          {title && <div className={styles.panelHeader}>{title}</div>}
          <div className={styles.panelBody}>{content}</div>
        </div>
      }
      trigger="click"
      placement={placement}
      overlayClassName={`${styles.popoverOverlay} ${
        isFixedOverlay ? styles.popoverOverlayFixed : ""
      }`}
      overlayStyle={overlayStyle}
      getPopupContainer={() => document.body}
    >
      <Tooltip
        title={title}
        open={Boolean(title) && tooltipVisible && !open}
        onOpenChange={setTooltipVisible}
        mouseLeaveDelay={0}
      >
        <span
          ref={triggerRef}
          onMouseEnter={showTooltip}
          className={styles.tooltipTrigger}
        >
          <Button
            size="small"
            className={`${styles.menuButton} ${
              open ? styles.menuButtonActive : ""
            }`}
            icon={icon}
            aria-label={title}
          />
        </span>
      </Tooltip>
    </Popover>
  );
}
