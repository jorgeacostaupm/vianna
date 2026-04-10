import React, { useCallback, useEffect, useState } from "react";
import { Tooltip } from "antd";
import { useSelector } from "react-redux";
import { selectShowInformativeTooltips } from "@/store/features/main";

export default function AutoCloseTooltip({
  title,
  children,
  placement = "top",
  autoCloseMs = 2000,
}) {
  const [visible, setVisible] = useState(false);
  const showInformativeTooltips = useSelector(selectShowInformativeTooltips);
  const shouldShowTooltip = Boolean(title) && showInformativeTooltips;

  const closeTooltip = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!shouldShowTooltip) {
      setVisible(false);
    }
  }, [shouldShowTooltip]);

  useEffect(() => {
    let timer;
    if (visible && autoCloseMs > 0) {
      timer = setTimeout(() => setVisible(false), autoCloseMs);
    }
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs]);

  useEffect(() => {
    if (!visible) return undefined;

    const handleWindowBlur = () => closeTooltip();
    const handleWindowFocus = () => closeTooltip();
    const handleCloseAllTooltips = () => closeTooltip();
    const handleVisibilityChange = () => {
      if (document.hidden) closeTooltip();
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("app:close-tooltips", handleCloseAllTooltips);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("app:close-tooltips", handleCloseAllTooltips);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [visible, closeTooltip]);

  return (
    <Tooltip
      title={shouldShowTooltip ? title : null}
      open={shouldShowTooltip && visible}
      onOpenChange={(nextVisible) => {
        if (shouldShowTooltip) {
          setVisible(nextVisible);
        }
      }}
      placement={placement}
    >
      <span
        onPointerDown={closeTooltip}
        onMouseEnter={() => {
          if (shouldShowTooltip) {
            setVisible(true);
          }
        }}
        onMouseLeave={() => setVisible(false)}
        onClick={closeTooltip}
        onFocus={(event) => {
          if (shouldShowTooltip && event.currentTarget.matches(":focus-visible")) {
            setVisible(true);
          }
        }}
        onBlur={closeTooltip}
        style={{ display: "inline-flex" }}
      >
        {children}
      </span>
    </Tooltip>
  );
}
