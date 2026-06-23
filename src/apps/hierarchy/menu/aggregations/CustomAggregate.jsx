import { useState, useRef } from "react";
import { useFormikContext } from "formik";
import { Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";

import { copyClipboard } from "@/utils/functions";
import { compileAggregationFormula } from "@/store/features/metadata/utils/thunkUtils";
import CustomFormulaHelpModalButton from "./CustomFormulaHelpModalButton";
import styles from "./DropArea.module.css";

const { Text } = Typography;

export const AttributePaste = ({ name }) => {
  const copyAttribute = async () => {
    await copyClipboard(`$(${name})`);
  };

  return (
    <div className={styles.copyAttributeItem} onClick={copyAttribute}>
      {name} <CopyOutlined />
    </div>
  );
};

const CustomAggregate = ({ nodes, formula }) => {
  const { errors, setFieldError, setFieldValue } =
    useFormikContext();
  const textRef = useRef();
  const [formulaText, setFormula] = useState(formula);

  const validateFormula = (e) => {
    const input = e.target.value.trim() === "" ? '""' : e.target.value;
    const compiled = compileAggregationFormula(input);

    if (!compiled.valid) {
      setFieldError(
        "aggregationConfig.formula",
        compiled.message || "Invalid formula",
      );
      return;
    }

    try {
      if (!compiled.nodes.every((n) => nodes.some((o) => o.name === n))) {
        throw {
          error: "Node not found",
          msg:
            "One of the nodes used does not correspond with the children of this aggregation." +
            " \n\nUsed Nodes: " +
            compiled.nodes.map((n) => '"' + n + `"`).join(", ") +
            "\n\nChild Nodes: " +
            nodes.map((n) => '"' + n.name + `"`).join(", "),
        };
      }

      const used = compiled.nodes
        .map((o) => nodes.find((n) => n.name == o)?.id)
        .filter((id) => Number.isInteger(id));
      setFieldValue("aggregationConfig.usedAttributes", used);
    } catch (error) {
      setFieldError("aggregationConfig.formula", `${error.msg}`);
      return;
    }
    setFieldValue("aggregationConfig.formula", textRef.current.value, true);
  };

  const handleInputChange = (event) => {
    setFormula(event.target.value);
    validateFormula(event);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Text strong>Aggregation Formula:</Text>
          <CustomFormulaHelpModalButton />
        </div>
        <textarea
          ref={textRef}
          value={formulaText}
          style={{
            width: "100%",
            minHeight: "120px",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "0.375rem",
            padding: "0.5rem",
            resize: "vertical",
            whiteSpace: "pre-line",
          }}
          onChange={handleInputChange}
          spellCheck={"false"}
          autoCorrect={"false"}
          placeholder={`Add an aggregation equation or formula.\n\n\nClick 'Help' for more information.`}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-evenly",
          color: "var(--color-error)",
          whiteSpace: "pre-wrap",
        }}
      >
        {errors?.aggregationConfig?.formula}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Text strong>Available Variables:</Text>
        <div className={styles.dropContainer}>
          {nodes.map((n) => {
            return <AttributePaste key={n.name} name={n.name} />;
          })}
        </div>
      </div>
    </>
  );
};

export default CustomAggregate;
