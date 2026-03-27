import { motion } from "framer-motion";
import { HorizontalDropIndicator as DropIndicator } from "./DropIndicator";
import { InputNumber, Tooltip } from "antd";
import { useFormikContext } from "formik";
import styles from "./DropArea.module.css";

const InputAttribute = ({ idx, node, onDragStart, isHidden = false }) => {
  const { setFieldValue } = useFormikContext();

  const handleChange = (value) => {
    setFieldValue(`info.usedAttributes.${idx}.weight`, value);
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
        id={`info.usedAttributes.${idx}`}
        draggable={true}
        onDragStart={(e) => onDragStart(e, { id: node.id, name: node.name })}
      >
        <Tooltip title={node.name}>
          <div
            id={`info.usedAttributes.${idx}.name`}
            name={`info.usedAttributes.${idx}.name`}
            className={styles.inputAttributeName}
          >
            {node.name}
          </div>
        </Tooltip>

        <div className={styles.inputAttributeRow}>
          <span className={styles.inputAttributeLabel}>W:</span>
          <InputNumber
            id={`info.usedAttributes.${idx}.weight`}
            name={`info.usedAttributes.${idx}.weight`}
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
