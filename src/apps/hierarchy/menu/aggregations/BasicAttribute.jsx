import { Tooltip } from "antd";

import styles from "./DropArea.module.css";

const BasicAttribute = ({ idx, node, onDragStart, isHidden = false }) => {
  return (
    <div
      style={{
        display: isHidden ? "none" : "flex",
        alignSelf: "center",
        justifySelf: "center",
      }}
    >
      <div
        className={styles.attributeItem}
        id={`aggregationConfig.usedAttributes.${idx}`}
        draggable={true}
        onDragStart={(e) => {
          onDragStart(e, { id: node.id, name: node.name });
          e.currentTarget.style.opacity = "0.5";
        }}
      >
        <Tooltip title={node.name}>
          <div id={`used-attribute-${idx}-name`} className={styles.inputAttributeName}>
            {node.name}
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default BasicAttribute;
