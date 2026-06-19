import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useFormikContext } from "formik";
import { SearchOutlined } from "@ant-design/icons";
import { Typography } from "antd";

import { compileAggregationFormula } from "@/store/features/metadata/utils/thunkUtils";

import CustomFormulaHelpModalButton from "./CustomFormulaHelpModalButton";
import styles from "./DropArea.module.css";
import { AttributePaste } from "./CustomAggregate";
import SaveButton from "../components/SaveButton";

const { Text } = Typography;

const CustomMeasure = ({ formula }) => {
  const attributes = useSelector((state) => state.metadata.attributes);
  const nodes = attributes.filter((n) => n.id !== 0);

  const { errors, setFieldError, setFieldValue, values } =
    useFormikContext();

  const [searchText, updateSearch] = useState("");
  const [formulaText, setFormula] = useState(formula);
  const textRef = useRef();

  const showNodes = nodes
    .filter(
      (n) =>
        n.name.toLowerCase().includes(searchText) && n.name !== values.name,
    )
    .sort((a, b) => a.name.length - b.name.length);

  const validateFormula = (e) => {
    const compiled = compileAggregationFormula(e.target.value);
    if (!compiled.valid) {
      setFieldError(
        "aggregationConfig.formula",
        compiled.message || "Invalid formula",
      );
      return;
    }

    try {
      const used = compiled.nodes
        .map((o) => nodes.find((n) => n.name === o)?.id)
        .filter((id) => Number.isInteger(id));
      setFieldValue("aggregationConfig.usedAttributes", used);
    } catch (error) {
      setFieldError(
        "aggregationConfig.formula",
        `${error.error} : ${error.msg}`,
      );
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
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text strong>Custom Formula:</Text>
          <CustomFormulaHelpModalButton />
        </div>

        <textarea
          ref={textRef}
          value={formulaText}
          onChange={handleInputChange}
          spellCheck={false}
          autoCorrect="false"
          placeholder="Add an aggregation formula"
          style={{
            width: "100%",
            minHeight: "50px",
            border: "1px solid var(--color-border-strong)",
            borderRadius: "0.375rem",
            padding: "0.5rem",
            resize: "vertical",
            whiteSpace: "pre-line",
          }}
        />
      </div>
      {errors?.aggregationConfig?.formula && (
        <div style={{ color: "var(--color-error)", marginTop: 4 }}>
          {errors.aggregationConfig.formula}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <SaveButton />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <Text strong>Available Variables:</Text>
        <div style={{ position: "relative", margin: "6px 0" }}>
          <SearchOutlined
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink-tertiary)",
              fontSize: 16,
            }}
          />
          <input
            type="text"
            placeholder="Search attributes..."
            value={searchText}
            onChange={(e) => updateSearch(e.target.value.toLowerCase())}
            style={{
              width: "100%",
              padding: "6px 10px 6px 32px",
              borderRadius: 6,
              border: "1px solid var(--primary-color)",
              fontSize: 14,
            }}
          />
        </div>

        <div className={styles.dropContainer}>
          {showNodes.map((n) => (
            <AttributePaste key={n.name} name={n.name} />
          ))}
        </div>
      </div>
    </>
  );
};

export default CustomMeasure;
