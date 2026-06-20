import {
  AppSettingsButton,
  DataManagementButton,
  GoToAppButton,
} from "@/components/buttons/app";
import { getStackedButtonTooltipPlacement } from "./buttonTooltipPlacement";

const ROW_STYLE = Object.freeze({ display: "flex", gap: "10px" });

export default function AppSwitcher({
  appIds = [],
  dataManagementButtonProps = {},
  settingsButtonProps = {},
  showManagement = true,
  managementAtEnd = false,
  trailing = null,
  tooltipPlacement,
  stackedTooltipPlacement = false,
  className,
  style,
}) {
  const rowStyle = style ? { ...ROW_STYLE, ...style } : ROW_STYLE;
  const managementButtonCount = showManagement ? 2 : 0;
  const totalButtonCount = appIds.length + managementButtonCount;
  const appStartIndex = showManagement && !managementAtEnd ? 2 : 0;
  const managementStartIndex = managementAtEnd ? appIds.length : 0;
  const getButtonTooltipPlacement = (index) =>
    stackedTooltipPlacement
      ? getStackedButtonTooltipPlacement(index, totalButtonCount, tooltipPlacement)
      : tooltipPlacement;
  const managementButtons = (
    <>
      <DataManagementButton
        tooltipPlacement={getButtonTooltipPlacement(managementStartIndex)}
        {...dataManagementButtonProps}
      />
      <AppSettingsButton
        tooltipPlacement={getButtonTooltipPlacement(managementStartIndex + 1)}
        {...settingsButtonProps}
      />
    </>
  );

  return (
    <div className={className} style={rowStyle}>
      {showManagement && !managementAtEnd && managementButtons}
      {appIds.map((appId, index) => (
        <GoToAppButton
          key={appId}
          to={appId}
          tooltipPlacement={getButtonTooltipPlacement(appStartIndex + index)}
        />
      ))}
      {showManagement && managementAtEnd && managementButtons}
      {trailing}
    </div>
  );
}
