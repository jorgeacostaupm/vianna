import React from "react";

import {
  SwitchButton,
  WarningNullButton,
  SendQuarantineButton as QuarantineButton,
  NavioLegendButton,
  NavioSettingsButton,
  EditColumnButton,
  ExportDataButton,
} from "@/components/buttons/navio";

import styles from "@/styles/ChartBar.module.css";

export default function Bar({ title, config, updateConfig }) {
  return (
    <>
      <div className={styles.chartBar} data-view-bar>
        <div className={styles.chartTitle} title={title}>
          {title}
        </div>

        <div className={styles.right}>
          <SwitchButton />
          <WarningNullButton />
          <QuarantineButton />

          <div className={styles.separator} />

          <EditColumnButton></EditColumnButton>
          <ExportDataButton></ExportDataButton>

          <div className={styles.separator} />

          <NavioLegendButton />
          <NavioSettingsButton
            config={config}
            updateConfig={updateConfig}
          ></NavioSettingsButton>
        </div>
      </div>
    </>
  );
}
