
import styles from "@/styles/ChartBar.module.css";

export default function BaseBar({
  title,
  hoverTitle,
  draggable = true,
  children,
}) {
  const titleHoverText = hoverTitle || title;
  const titleClassName = [
    draggable ? `${styles.dragHandle} drag-handle` : null,
    styles.chartTitle,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.chartBar} data-view-bar>
      <div className={titleClassName} title={titleHoverText}>
        {title}
      </div>

      <div className={styles.right}>{children}</div>
    </div>
  );
}
