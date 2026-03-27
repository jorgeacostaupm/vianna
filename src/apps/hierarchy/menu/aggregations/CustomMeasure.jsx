import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useFormikContext } from "formik";
import { SearchOutlined } from "@ant-design/icons";
import { Typography } from "antd";

import { get_parser } from "../logic/parser";
import buildAggregation from "../logic/formulaGenerator";

import { QuestionCircleOutlined } from "@ant-design/icons";
import PopoverButton from "@/components/ui/PopoverButton";
import CustomFormulaHelp from "./CustomFormulaHelp";
import styles from "./DropArea.module.css";
import { AttributePaste } from "./CustomAggregate";
import { SaveButton } from "../NodeMenu";

const { Text } = Typography;

let parser = get_parser();

const CustomMeasure = ({ formula }) => {
  const attributes = useSelector((state) => state.metadata.attributes);
  const nodes = attributes.filter((n) => n.id !== 0);

  const { errors, setFieldError, setFieldValue, values, setTouched } =
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
    let parsed;
    try {
      parsed = parser.parse(e.target.value);
    } catch {
      setFieldError("info.formula", "Invalid formula");
      return;
    }

    try {
      const executable_code = buildAggregation(parsed);
      setFieldValue("info.exec", executable_code.formula, false);
      setTouched("info.exec", false);

      const used = executable_code.nodes.map((o) => ({
        name: o,
        used: true,
        weight: 1,
        id: nodes.find((n) => n.name === o)?.id,
      }));
      setFieldValue("info.usedAttributes", used);
    } catch (error) {
      setFieldError("info.formula", `${error.error} : ${error.msg}`);
      return;
    }

    setFieldValue("info.formula", textRef.current.value, true);
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
          <PopoverButton
            title="Custom Operations Help"
            content={<CustomFormulaHelp />}
            placement="left"
            icon={<QuestionCircleOutlined />}
          />
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
      {errors?.info?.formula && (
        <div style={{ color: "var(--color-error)", marginTop: 4 }}>
          {errors.info.formula}
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
