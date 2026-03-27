import { useState, useRef } from "react";
import { useFormikContext } from "formik";
import { Typography } from "antd";
import { CopyOutlined } from "@ant-design/icons";

import { copyClipboard } from "@/utils/functions";
import { get_parser } from "../logic/parser";
import buildAggregation from "../logic/formulaGenerator";
import { QuestionCircleOutlined } from "@ant-design/icons";
import PopoverButton from "@/components/ui/PopoverButton";
import CustomFormulaHelp from "./CustomFormulaHelp";
import styles from "./DropArea.module.css";

const { Text } = Typography;

let parser = get_parser();

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

const CustomAggregate = ({ nodes, formula, save }) => {
  const { errors, setFieldError, setFieldValue, setTouched } =
    useFormikContext();
  const textRef = useRef();
  const [formulaText, setFormula] = useState(formula);

  const validateFormula = (e) => {
    let parsed;
    try {
      const input = e.target.value.trim() === "" ? '""' : e.target.value;
      parsed = parser.parse(input);
    } catch {
      setFieldError("info.formula", "Invalid formula");
      return;
    }

    try {
      const executable_code = buildAggregation(parsed);
      if (
        !executable_code.nodes.every((n) => nodes.some((o) => o.name === n))
      ) {
        throw {
          error: "Node not found",
          msg:
            "One of the nodes used does not correspond with the children of this aggregation." +
            " \n\nUsed Nodes: " +
            executable_code.nodes.map((n) => '"' + n + `"`).join(", ") +
            "\n\nChild Nodes: " +
            nodes.map((n) => '"' + n.name + `"`).join(", "),
        };
      }
      setFieldValue("info.exec", executable_code.formula, false);
      setTouched("info.exec", false);

      let used = executable_code.nodes.map((o) => {
        const usedNode = { name: o, used: true, weight: 1 }; // corrected 'weigth' to 'weight'
        usedNode.id = nodes.find((n) => n.name == o)?.id; // it is expected that the node exists so there will be no check
        return usedNode;
      });
      setFieldValue("info.usedAttributes", used);
    } catch (error) {
      setFieldError("info.formula", `${error.msg}`);
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
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Text strong>Aggregation Formula:</Text>
          <PopoverButton
            title={"Custom Operations Help"}
            content={<CustomFormulaHelp />}
            placement="left"
            icon={<QuestionCircleOutlined></QuestionCircleOutlined>}
          ></PopoverButton>
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
        {errors?.info?.formula}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        {save}
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
