import React from "react";

import LegendButton from "@/components/Buttons/LegendButton";
import SwitchButton from "@/components/Buttons/SwitchButton";
import SettingsButton from "@/components/Buttons/SettingsButton";
import RestoreDataButton from "@/components/Buttons/RestoreDataButton";
import EditQuarantineButton from "@/components/Buttons/EditQuarantineButton";

import styles from "@/styles/ChartBar.module.css";

export default function Bar({ title, config, updateConfig }) {
  return (
    <div className={styles.chartBar} data-view-bar>
      <div className={styles.chartTitle} title={title}>
        {title}
      </div>

      <div className={styles.right}>
        <RestoreDataButton />
        <SwitchButton />
        <EditQuarantineButton />
        <LegendButton />
        <SettingsButton config={config} updateConfig={updateConfig} />
      </div>
    </div>
  );
}
