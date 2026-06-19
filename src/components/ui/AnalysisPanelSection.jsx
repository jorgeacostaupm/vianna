import styles from "@/styles/modules/analysisPanels.module.css";

export default function AnalysisPanelSection({
  title,
  children,
  variant = "default",
}) {
  const panelClassName =
    variant === "context"
      ? `${styles.panelBox} ${styles.panelBoxContext}`
      : styles.panelBox;

  return (
    <section className={panelClassName}>
      <div className={styles.panelBoxTitle}>{title}</div>
      <div className={styles.panelBoxBody}>{children}</div>
    </section>
  );
}
