import BasicAttribute from "./BasicAttribute";
import { useState } from "react";
import { Typography } from "antd";
import {
  clearHightlight,
  getIndicators,
  getNearestIndicator,
  highlightIndicators,
} from "./DropIndicator";
import styles from "./DropArea.module.css";

const { Text } = Typography;

const ChildHolder = ({ allNodes, nodes, moveNode }) => {
  const [active, setActive] = useState(false);
  const [searchText] = useState("");

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
    highlightIndicators(event, "false");
    event.preventDefault();
  };
  const onDragLeave = () => {
    setActive(false);
    clearHightlight(null, false);
  };
  const onDragEnd = (event) => {
    const attrId = event.dataTransfer.getData("attributeId");
    const nodeId = parseInt(attrId);

    setActive(false);
    clearHightlight(null, false);

    // Calculate the final position of the moved element
    const indicators = getIndicators(false);
    const { element } = getNearestIndicator(event, indicators);

    const before = element.dataset.before || "-1";
    if (before === attrId) return;

    let transfered = allNodes.find((n) => n.id === nodeId);
    if (transfered == null) return;

    let unusedNodes = nodes.filter((n) => n.id !== nodeId);

    transfered = { ...transfered, used: false };
    const position =
      before === "-1"
        ? -1
        : unusedNodes.findIndex((el) => el.id === parseInt(before));
    moveNode(transfered, false, position);
  };

  return (
    <>
      <Text strong>Available Attributes:</Text>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDragEnd}
        id="placeholder"
        className={`${styles.dropContainer} ${
          active ? styles.dropContainerActive : ""
        }`}
      >
        {nodes.map((n) => {
          return (
            <BasicAttribute
              key={n.id}
              node={n}
              onDragStart={handleDragStart}
              isHidden={!n.name.toLowerCase().includes(searchText)}
            ></BasicAttribute>
          );
        })}
      </div>
    </>
  );
};

export default ChildHolder;
