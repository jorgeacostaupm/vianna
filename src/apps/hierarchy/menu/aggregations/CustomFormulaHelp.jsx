import { Typography } from "antd";
import {
  ROW_FUNCTIONS,
  COLUMN_FUNCTIONS,
  SPECIAL_FUNCTIONS,
} from "../logic/formulaConstants";
import { copyClipboard } from "@/utils/functions";
import styles from "./CustomFormulaHelp.module.css";

const { Text } = Typography;

const QUICK_RULES = [
  "Reference variables as $(Variable Name).",
  "Arithmetic operators: +, -, *, /, ^.",
  "Comparisons: ==, !=, <, <=, >, >=.",
  "Logic operators: & (and), | (or), ~ (not).",
  'Use double quotes for text values, e.g. "MCI".',
];

const EXAMPLES = [
  {
    label: "Average of two nodes",
    formula: "($(NodeA) + $(NodeB)) / 2",
  },
  {
    label: "Group z-score",
    formula: "zscoreByGroup($(Score), $(Site))",
  },
  {
    label: "Manual z-score",
    formula: "zscoreByValues($(Score), 55.2, 8.7)",
  },
  {
    label: "Conditional flag",
    formula: '($(Age) >= 65) & ($(Status) == "MCI")',
  },
  {
    label: "String merge",
    formula: 'string($(FirstName)) + " " + string($(LastName))',
  },
];

const formatArgs = (count) =>
  Array.from({ length: count }, (_, index) => {
    if (index === 0) return "$(NodeA)";
    if (index === 1) return "$(NodeB)";
    return `arg${index + 1}`;
  }).join(", ");

const buildSignature = (name, count) =>
  count === 0 ? `${name}()` : `${name}(${formatArgs(count)})`;

const sortedEntries = (items) =>
  Object.entries(items).sort(([a], [b]) => a.localeCompare(b));

function FunctionSection({ title, items, onCopy }) {
  return (
    <div className={styles.section}>
      <Text strong className={styles.sectionTitle}>
        {title}
      </Text>
      <div className={styles.functionGrid}>
        {sortedEntries(items).map(([name, config]) => {
          const signature = buildSignature(name, config.args);
          return (
            <button
              key={name}
              type="button"
              className={styles.functionChip}
              onClick={() => onCopy(signature, `${name} template copied`)}
              title="Copy function template"
            >
              <span className={styles.functionName}>{name}</span>
              <code className={styles.functionSignature}>{signature}</code>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomFormulaHelp() {
  const handleCopy = async (value) => {
    copyClipboard(value);
  };

  return (
    <div className={styles.helpPanel}>
      <div className={styles.hero}>
        <Text strong className={styles.heroTitle}>
          Custom Formula Builder
        </Text>
        <Text type="secondary">
          Quick reference for syntax, examples, and available functions.
        </Text>
      </div>

      <div className={styles.section}>
        <Text strong className={styles.sectionTitle}>
          Quick syntax
        </Text>
        <div className={styles.ruleList}>
          {QUICK_RULES.map((rule) => (
            <div key={rule} className={styles.ruleItem}>
              {rule}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <Text strong className={styles.sectionTitle}>
          Examples (click to copy)
        </Text>
        <div className={styles.exampleList}>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              className={styles.exampleButton}
              onClick={() => handleCopy(example.formula)}
              title="Copy example"
            >
              <span className={styles.exampleLabel}>{example.label}</span>
              <code className={styles.exampleCode}>{example.formula}</code>
            </button>
          ))}
        </div>
      </div>

      <FunctionSection
        title="Row functions"
        items={ROW_FUNCTIONS}
        onCopy={handleCopy}
      />
      <FunctionSection
        title="Aggregation functions"
        items={COLUMN_FUNCTIONS}
        onCopy={handleCopy}
      />
      <FunctionSection
        title="Special functions"
        items={SPECIAL_FUNCTIONS}
        onCopy={handleCopy}
      />

      <div className={styles.footerNote}>
        Tip: click an item in Available Variables to copy{" "}
        <code className={styles.inlineCode}>$(Variable Name)</code>.
      </div>
    </div>
  );
}
