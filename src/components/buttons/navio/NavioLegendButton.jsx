import * as d3 from "d3";
import { Typography } from "antd";
import { BgColorsOutlined } from "@ant-design/icons";

import PopoverButton from "@/components/buttons/ui/PopoverButton";
import styles from "./NavioLegendButton.module.css";

const TABLEAU_YELLOW = "#edc949";
const NAVIO_CATEGORIES = [
  ...d3.schemeTableau10.filter((color) => color !== TABLEAU_YELLOW),
  TABLEAU_YELLOW,
];

const colorScales = {
  Categories: NAVIO_CATEGORIES,
  Sequential: d3.scaleSequential(d3.interpolateBlues),
  Divergent: d3.scaleSequential(d3.interpolateBrBG),
  Ordered: d3.scaleSequential(d3.interpolateOranges),
  Dates: d3.scaleSequential(d3.interpolatePurples),
  Text: d3.scaleSequential(d3.interpolateGreys),
};

const generateGradient = (scale, steps = 12) => {
  if (Array.isArray(scale)) return scale;
  return Array.from({ length: steps }, (_, i) => scale(i / (steps - 1)));
};

const { Text } = Typography;

function Legend() {
  return (
    <div className={styles.legend}>
      {Object.entries(colorScales).map(([name, scale]) => (
        <div className={styles.scale} key={name}>
          <Text className={styles.scaleTitle} strong>
            {name}
          </Text>
          <div className={styles.swatches} aria-hidden="true">
            {generateGradient(scale).map((color, index) => (
              <div
                className={styles.swatch}
                key={index}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NavioLegendButton() {
  return (
    <>
      <PopoverButton
        title={"Legend"}
        icon={<BgColorsOutlined />}
        content={<Legend></Legend>}
        panelWidth={360}
      ></PopoverButton>
    </>
  );
}
