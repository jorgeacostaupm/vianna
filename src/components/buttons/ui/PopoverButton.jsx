import { Popover } from "antd";
import styles from "./PopoverButton.module.css";
import useAnchoredOverlay from "@/components/ui/useAnchoredOverlay";
import { AppButton, APP_BUTTON_PRESETS } from "@/components/buttons/core";

export default function PopoverButton({
  content,
  icon,
  title,
  placement = "bottomRight",
  tooltipDuration = 1500,
  panelWidth,
}) {
  const {
    open,
    overlayStyle,
    isFixedOverlay,
    triggerRef,
    handleOpenChange: handleOverlayOpenChange,
  } = useAnchoredOverlay();

  const handleOpenChange = (nextOpen) => {
    handleOverlayOpenChange(nextOpen);
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      arrow={false}
      content={
        <div
          className={styles.panel}
          style={panelWidth ? { width: panelWidth } : undefined}
        >
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
      <span ref={triggerRef} className={styles.tooltipTrigger}>
        <AppButton
          preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
          active={open}
          icon={icon}
          tooltip={open ? null : title}
          tooltipAutoCloseMs={tooltipDuration}
          ariaLabel={title || "Open menu"}
        />
      </span>
    </Popover>
  );
}
