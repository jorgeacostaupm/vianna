
import {
  NavioLegendButton,
  SwitchButton,
  NavioSettingsButton,
  RestoreDataButton,
  EditQuarantineColumnButton,
} from "@/components/buttons/navio";

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
        <EditQuarantineColumnButton />
        <NavioLegendButton />
        <NavioSettingsButton config={config} updateConfig={updateConfig} />
      </div>
    </div>
  );
}
