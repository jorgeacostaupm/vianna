import { motion } from "framer-motion";
import { HorizontalDropIndicator as DropIndicator } from "./DropIndicator";
import { InputNumber, Tooltip } from "antd";
import styles from "./DropArea.module.css";

const InputAttribute = ({
  idx,
  node,
  onDragStart,
  onWeightChange,
  isHidden = false,
}) => {
  const handleChange = (value) => {
    onWeightChange?.(node.id, value);
  };

  return (
    <div
      style={{
        display: isHidden ? "none" : "block",
      }}
    >
      <DropIndicator used={`${node.used}`} nodeID={node.id} />
      <motion.div
        className={styles.inputAttributeItem}
        layout
        layoutId={node.id}
        id={`aggregationConfig.usedAttributes.${idx}`}
        draggable={true}
        onDragStart={(e) => onDragStart(e, { id: node.id, name: node.name })}
      >
        <Tooltip title={node.name}>
          <div
            id={`used-attribute-${idx}-name`}
            className={styles.inputAttributeName}
          >
            {node.name}
          </div>
        </Tooltip>

        <div className={styles.inputAttributeRow}>
          <span className={styles.inputAttributeLabel}>W:</span>
          <InputNumber
            id={`used-attribute-${idx}-weight`}
            className={styles.inputAttributeWeightInput}
            min={-Infinity}
            max={Infinity}
            size="small"
            step={1}
            value={node.weight}
            onChange={handleChange}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default InputAttribute;
