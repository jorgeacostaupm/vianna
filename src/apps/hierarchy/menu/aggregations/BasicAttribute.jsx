import { motion } from "framer-motion";
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
      <motion.div
        className={styles.attributeItem}
        layout
        layoutId={node.id}
        id={`aggregationConfig.usedAttributes.${idx}`}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
      </motion.div>
    </div>
  );
};

export default BasicAttribute;
