import {
  AppSettingsButton,
  DataManagementButton,
  GoToAppButton,
} from "@/components/buttons/app";

const ROW_STYLE = Object.freeze({ display: "flex", gap: "10px" });

export default function AppSwitcher({
  appIds = [],
  dataManagementButtonProps = {},
  settingsButtonProps = {},
  showManagement = true,
  managementAtEnd = false,
  trailing = null,
  className,
  style,
}) {
  const rowStyle = style ? { ...ROW_STYLE, ...style } : ROW_STYLE;
  const managementButtons = (
    <>
      <DataManagementButton {...dataManagementButtonProps} />
      <AppSettingsButton {...settingsButtonProps} />
    </>
  );

  return (
    <div className={className} style={rowStyle}>
      {showManagement && !managementAtEnd && managementButtons}
      {appIds.map((appId) => (
        <GoToAppButton key={appId} to={appId} />
      ))}
      {showManagement && managementAtEnd && managementButtons}
      {trailing}
    </div>
  );
}
