import { Button } from "antd";
import buttonStyles from "@/styles/Buttons.module.css";
import AutoCloseTooltip from "./AutoCloseTooltip";

export default function ColoredButton({
  title = "",
  icon = null,
  onClick,
  placement,
  disabled = false,
  loading = false,
  children,
  shape = "default",
  ...buttonProps
}) {
  return (
    <AutoCloseTooltip title={title} placement={placement}>
      <Button
        shape={shape}
        className={buttonStyles.myButton}
        icon={icon}
        onClick={onClick}
        disabled={disabled}
        loading={loading}
        {...buttonProps}
      >
        {children}
      </Button>
    </AutoCloseTooltip>
  );
}
