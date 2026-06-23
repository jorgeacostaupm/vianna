import {
  ApiOutlined,
  SettingOutlined,
  ExperimentOutlined,
  InfoCircleFilled,
  CloseOutlined,
  SyncOutlined,
} from "@ant-design/icons";

import DownloadButton from "@/components/buttons/ui/DownloadButton";
import ViewRecordsDownloadButton from "@/components/buttons/ui/ViewRecordsDownloadButton";
import {
  AppButton,
  APP_BUTTON_PRESETS,
  APP_BUTTON_VARIANTS,
} from "@/components/buttons/core";
import buttonStyles from "@/components/buttons/core/AppButton.module.css";
import PopoverButton from "@/components/buttons/ui/PopoverButton";

const DEFAULT_CHART_BAR_ACTION_ORDER = Object.freeze([
  "sync",
  "records-export",
  "download",
  "results",
  "tests",
  "lmm",
  "info",
  "settings",
  "close",
]);

function buildSyncAction({ isSync, updateConfig }) {
  if (typeof updateConfig !== "function") return null;

  const tooltip = isSync
    ? "Synced with Explorer selection. Click to freeze this view."
    : "Frozen selection. Click to sync with Explorer again.";

  return (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      key="sync"
      active={isSync}
      tooltip={tooltip}
      ariaLabel={tooltip}
      className={buttonStyles.syncButton}
      icon={<SyncOutlined />}
      onClick={() => updateConfig("isSync", !isSync)}
      variant={
        isSync ? APP_BUTTON_VARIANTS.TOOLBAR : APP_BUTTON_VARIANTS.TOOLBAR_MUTED
      }
    />
  );
}

function buildRecordsExportAction({ recordsExport }) {
  return recordsExport ? (
    <ViewRecordsDownloadButton key="records-export" {...recordsExport} />
  ) : null;
}

function buildDownloadAction({ svgIDs, title }) {
  return svgIDs ? (
    <DownloadButton key="download" svgIds={svgIDs} filename={`${title}`} />
  ) : null;
}

function buildInfoAction({ info }) {
  return info ? (
    <PopoverButton
      key="info"
      content={info}
      icon={<InfoCircleFilled />}
      title="About this view"
    />
  ) : null;
}

function buildSettingsAction({ settings }) {
  return settings ? (
    <PopoverButton
      key="settings"
      content={settings}
      icon={<SettingOutlined />}
      title="View settings"
      panelWidth={400}
    />
  ) : null;
}

function buildTestsAction({ testsSettings, testsTitle }) {
  return testsSettings ? (
    <PopoverButton
      key="tests"
      content={testsSettings}
      icon={<ExperimentOutlined />}
      title={testsTitle || "Tests"}
      panelWidth={400}
    />
  ) : null;
}

function buildLmmAction({ lmmSettings }) {
  return lmmSettings ? (
    <PopoverButton
      key="lmm"
      content={lmmSettings}
      icon={<ApiOutlined />}
      title="LMM"
      panelWidth={400}
    />
  ) : null;
}

function buildResultsAction({ results }) {
  return results ? (
    <PopoverButton
      key="results"
      content={results}
      icon={<InfoCircleFilled />}
      title="Results"
      panelWidth={420}
    />
  ) : null;
}

function buildCloseAction({ remove }) {
  return remove ? (
    <AppButton
      preset={APP_BUTTON_PRESETS.TOOLBAR_ICON}
      key="close"
      tooltip="Close view"
      ariaLabel="Close view"
      icon={<CloseOutlined />}
      onClick={remove}
    />
  ) : null;
}

const DEFAULT_ACTION_BUILDERS = Object.freeze({
  sync: buildSyncAction,
  "records-export": buildRecordsExportAction,
  download: buildDownloadAction,
  info: buildInfoAction,
  results: buildResultsAction,
  settings: buildSettingsAction,
  tests: buildTestsAction,
  lmm: buildLmmAction,
  close: buildCloseAction,
});

function resolveConfiguredActions({ actions, context }) {
  if (typeof actions === "function") {
    const generated = actions(context);
    return Array.isArray(generated) ? generated : [];
  }
  if (Array.isArray(actions)) {
    return actions;
  }
  return DEFAULT_CHART_BAR_ACTION_ORDER.map((id) =>
    DEFAULT_ACTION_BUILDERS[id]?.(context),
  );
}

function materializeAction(action, context, index) {
  if (typeof action === "string") {
    return DEFAULT_ACTION_BUILDERS[action]?.(context);
  }
  if (typeof action === "function") {
    return action(context, index);
  }
  return action;
}

export function resolveChartBarActions({ actions, context }) {
  return resolveConfiguredActions({ actions, context })
    .map((action, index) => materializeAction(action, context, index))
    .filter(Boolean);
}
