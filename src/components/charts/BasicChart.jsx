import styles from "@/styles/Charts.module.css";

export default function BasicChart({ id, chartRef }) {
  return <svg ref={chartRef} id={id} className={styles.chartSvg} />;
}
