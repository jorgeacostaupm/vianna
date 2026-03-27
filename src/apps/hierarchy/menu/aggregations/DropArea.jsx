import { useState } from "react";
import { Button, Tooltip, Typography } from "antd";
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
import buttonStyles from "@/styles/Buttons.module.css";
import styles from "./DropArea.module.css";

const { Text } = Typography;

const DropArea = ({
  allNodes,
  aggOp,
  nodes,
  moveNode,
  modeAllNodes,
  insertNodeField,
  pushNodeField,
  moveNodeField,
  save,
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

    let usedNodes = nodes.filter((n) => n.used && n.id !== nodeId);

    transfered = { ...transfered, used: true };
    const position =
      before === "-1"
        ? -1
        : usedNodes.findIndex((el) => el.id === parseInt(before));
    if (nodes.filter((n) => n.id === nodeId).length > 0) {
      const current = nodes.findIndex((n) => n.id === nodeId);
      if (current !== -1) {
        moveNodeField(current, position);
      }
    } else {
      if (position === -1) {
        pushNodeField(transfered);
      } else {
        insertNodeField(position, transfered);
      }
    }

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
        {errors?.info?.formula}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <Tooltip title={"Add all variables"}>
          <Button
            shape="circle"
            size="large"
            className={buttonStyles.coloredButton}
            onClick={() => modeAllNodes(true)}
            icon={<CopyOutlined />}
          />
        </Tooltip>

        {save}

        <Tooltip title={"Delete all variables"}>
          <Button
            className={buttonStyles.coloredButton}
            shape="circle"
            size="large"
            onClick={() => modeAllNodes(false)}
            icon={<DeleteOutlined />}
          />
        </Tooltip>
      </div>
    </>
  );
};

export default DropArea;
