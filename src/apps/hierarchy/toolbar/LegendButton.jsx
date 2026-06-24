import { BgColorsOutlined } from "@ant-design/icons";

import { NodeColors } from "@/utils/constants";
import styles from "./LegendButton.module.css";
import PopoverButton from "@/components/buttons/ui/PopoverButton";

const renderShapeSVG = (shape, color) => {
  const iconProps = {
    className: styles.shapeIcon,
    "aria-hidden": "true",
    focusable: "false",
  };

  switch (shape) {
    case "triangle":
      return (
        <svg {...iconProps} viewBox="-15 -15 30 30">
          <path
            d="M 0 -14.4 L 12.5 7.2 L -12.5 7.2 Z"
            fill={color}
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
        </svg>
      );
    case "square":
      return (
        <svg {...iconProps} viewBox="-15 -15 30 30">
          <rect
            x="-12.5"
            y="-12.5"
            width="25"
            height="25"
            rx="4"
            fill={color}
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
        </svg>
      );
    case "circle":
      return (
        <svg {...iconProps} viewBox="-15 -15 30 30">
          <circle
            r="12.5"
            fill={color}
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
        </svg>
      );
    case "rect":
      return (
        <svg
          {...iconProps}
          className={`${styles.shapeIcon} ${styles.shapeIconWide}`}
          viewBox="0 0 40 20"
        >
          <rect
            x="0"
            y="0"
            width="40"
            height="15"
            rx="3"
            fill={color}
            stroke="var(--color-ink)"
            strokeWidth="1"
          />
        </svg>
      );
    default:
      return null;
  }
};

function LegendSection({ title, items }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.items}>
        {items.map(({ name, shape, color }) => (
          <div className={styles.item} key={name}>
            <span className={styles.marker}>{renderShapeSVG(shape, color)}</span>
            <span className={styles.itemLabel}>{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Legend() {
  const shapeLegend = [
    { name: "Original attribute", shape: "circle", color: "white" },
    { name: "Aggregation with children", shape: "square", color: "white" },
    { name: "Aggregation without children", shape: "triangle", color: "white" },
  ];

  const colorLegend = [
    { name: "Number", shape: "circle", color: NodeColors.NUMERICAL },
    { name: "Text", shape: "circle", color: NodeColors.TEXT },
    {
      name: "Unknown",
      shape: "circle",
      color: NodeColors.UNKNOWN,
    },
  ];

  return (
    <div className={styles.legend}>
      <LegendSection title="Node types" items={shapeLegend} />
      <LegendSection title="Attribute types" items={colorLegend} />
    </div>
  );
}

export default function LegendButton() {
  return (
    <PopoverButton
      title={"Legend"}
      icon={<BgColorsOutlined />}
      content={<Legend></Legend>}
      panelWidth={320}
    ></PopoverButton>
  );
}
