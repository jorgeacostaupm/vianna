import { useState } from "react";
import { Typography } from "antd";
import { useFormikContext } from "formik";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  clearHightlight,
  getIndicators,
  getNearestIndicator,
  highlightIndicators,
  DropIndicator,
} from "./DropIndicator";
import BasicAttribute from "./BasicAttribute";
import InputAttribute from "./InputAttribute";
import styles from "./DropArea.module.css";
import { AppButton, APP_BUTTON_VARIANTS } from "@/components/buttons/core";

const { Text } = Typography;

const DropArea = ({
  allNodes,
  aggOp,
  nodes,
  moveNode,
  updateNodeWeight,
  modeAllNodes,
}) => {
  const [active, setActive] = useState(false);
  const [searchText] = useState("");

  const { errors } = useFormikContext();

  const handleDragStart = (e, attribute) => {
    e.dataTransfer.setData("attributeId", attribute.id);

    // Evita el preview negro
    const img = new Image();
    img.src =
      "data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjEiIHdpZHRoPSIxIi8+"; // Imagen vacía
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragOver = (event) => {
    setActive(true);
    highlightIndicators(event, "true");
    event.preventDefault();
  };

  const onDragLeave = () => {
    setActive(false);
    clearHightlight(null, true);
  };

  const onDragEnd = (event) => {
    const attrId = event.dataTransfer.getData("attributeId");
    const nodeId = parseInt(attrId);

    setActive(false);
    clearHightlight(null, true);

    // Calculate the final position of the moved element
    const indicators = getIndicators(true);
    const { element } = getNearestIndicator(event, indicators);

    const before = element.dataset.before || "-1";
    if (before === attrId) return;

    let transfered = allNodes.find((n) => n.id === nodeId);
    if (transfered == null) return;

    let usedNodes = nodes.filter((n) => n.id !== nodeId);

    transfered = { ...transfered, used: true };
    const position =
      before === "-1"
        ? -1
        : usedNodes.findIndex((el) => el.id === parseInt(before));

    moveNode(transfered, true, position);
  };

  return (
    <>
      <Text strong>Included Attributes:</Text>

      <div
        id="attributes"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDragEnd}
        className={`${styles.dropContainer} ${
          active ? styles.dropContainerActive : ""
        }`}
      >
        {nodes.map((n, i) => {
          if (aggOp !== "mean") {
            return (
              <BasicAttribute
                key={n.id}
                idx={i}
                node={n}
                onDragStart={handleDragStart}
                isHidden={!n.name.toLowerCase().includes(searchText)}
              ></BasicAttribute>
            );
          } else {
            return (
              <InputAttribute
                key={n.id}
                idx={i}
                node={n}
                onDragStart={handleDragStart}
                onWeightChange={updateNodeWeight}
                isHidden={!n.name.toLowerCase().includes(searchText)}
              ></InputAttribute>
            );
          }
        })}
        <DropIndicator used={true}></DropIndicator>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-evenly",
          color: "red",
        }}
      >
        {errors?.aggregationConfig?.formula}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        <AppButton
          variant={APP_BUTTON_VARIANTS.ACTION}
          onClick={() => modeAllNodes(true)}
          icon={<CopyOutlined />}
          style={{ minWidth: 112 }}
        >
          Add all
        </AppButton>

        <AppButton
          variant={APP_BUTTON_VARIANTS.ACTION}
          onClick={() => modeAllNodes(false)}
          icon={<DeleteOutlined />}
          style={{ minWidth: 112 }}
        >
          Remove all
        </AppButton>
      </div>
    </>
  );
};

export default DropArea;
