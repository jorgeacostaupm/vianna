import { forwardRef } from "react";
import { Button } from "antd";
import AutoCloseTooltip from "@/components/ui/AutoCloseTooltip";
import styles from "./AppButton.module.css";

import {
  APP_BUTTON_VARIANTS,
  resolveButtonActiveClassName,
  resolveButtonPresetProps,
  resolveButtonVariantClassName,
} from "./buttonVariants";

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

const AppButton = forwardRef(function AppButton(
  {
    preset,
    variant,
    size,
    shape,
    type,
    active = false,
    tooltip,
    tooltipDisabled = false,
    tooltipPlacement = "top",
    tooltipAutoCloseMs = 2000,
    ariaLabel,
    className,
    ...buttonProps
  },
  ref,
) {
  const presetProps = resolveButtonPresetProps(preset);
  const resolvedVariant =
    variant ?? presetProps?.variant ?? APP_BUTTON_VARIANTS.BRAND;
  const resolvedSize = size ?? presetProps?.size;
  const resolvedShape = shape ?? presetProps?.shape;
  const resolvedType = type ?? presetProps?.type;
  const variantClassName = resolveButtonVariantClassName(resolvedVariant);
  const activeClassName = resolveButtonActiveClassName(active);
  const resolvedAriaLabel = buttonProps["aria-label"] ?? ariaLabel;
  const button = (
    <Button
      ref={ref}
      {...buttonProps}
      className={joinClassNames(
        styles.buttonBase,
        variantClassName,
        activeClassName,
        className,
      )}
      size={resolvedSize}
      shape={resolvedShape}
      type={resolvedType}
      aria-label={resolvedAriaLabel}
      data-active={active || undefined}
    />
  );

  if (!tooltip) {
    return button;
  }

  return (
    <AutoCloseTooltip
      title={tooltip}
      placement={tooltipPlacement}
      autoCloseMs={tooltipAutoCloseMs}
      disabled={tooltipDisabled}
    >
      {button}
    </AutoCloseTooltip>
  );
});

export default AppButton;
