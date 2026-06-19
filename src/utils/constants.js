export const APP_NAME = "VIANNA";

export const DEFAULT_GROUP_VARIABLE = "site";
export const DEFAULT_TIMESTAMP_VARIABLE = "visit";

export const ORDER_VARIABLE = "__ord";
const DESCRIPTION_VARIABLE = "__desc";

export const HIDDEN_VARIABLES = [ORDER_VARIABLE, DESCRIPTION_VARIABLE];

const withBase = (p) => `${import.meta.env?.BASE_URL ?? "/"}${p}`;

export const DATASETS = {
  prod: {
    dataPath: withBase("vis/csv/ai-mind-demo-data.csv"),
    hierarchyPath: withBase("vis/hierarchies/ai-mind-demo-hierarchy.json"),
    descriptionsPath: withBase(
      "vis/descriptions/ai-mind-variable-descriptions.csv",
    ),
    idVar: "id",
    groupVar: "Country",
    timeVar: "Visit Name",
  },
  dev: {
    dataPath: withBase("vis/csv/private/ai-mind-data-sept-2025.csv"),
    hierarchyPath: withBase("vis/hierarchies/ai-mind-hierarchy.json"),
    descriptionsPath: withBase(
      "vis/descriptions/ai-mind variable descriptions.csv",
    ),
    idVar: "pseudon_id",
    groupVar: "site",
    timeVar: "visit",
  },
};

export const Apps = Object.freeze({
  OVERVIEW: "Overview",
  HIERARCHY: "Hierarchy Editor",
  COMPARE: "Comparison",
  CORRELATION: "Correlation",
  EVOLUTION: "Evolution",
  QUARANTINE: "Quarantine",
});

export const VariableTypes = Object.freeze({
  CATEGORICAL: "string",
  NUMERICAL: "number",
  UNKNOWN: "Unknown",
});

export const NodeColors = Object.freeze({
  TEXT: "#fc8d62",
  NUMERICAL: "#66c2a5",
  UNKNOWN: "#8da0cb",
  SELECTION: "#66c2a5",
});

export const DataType = Object.freeze({
  TEXT: { color: NodeColors.TEXT, name: "Categorical", dtype: "string" },
  NUMERICAL: {
    color: NodeColors.NUMERICAL,
    name: "Numerical",
    dtype: "number",
  },
  UNKNOWN: { color: NodeColors.UNKNOWN, name: "Unknown", dtype: "determine" },
});

export function getColorByDtype(dtype) {
  const entry = Object.values(DataType).find((item) => item.dtype === dtype);
  return entry ? entry.color : null;
}

export function getNameByDtype(dtype) {
  const entry = Object.values(DataType).find((item) => item.dtype === dtype);
  return entry ? entry.name : null;
}

// DESCRIPTIONS

export const APP_DESC =
  "VIANNA (Visual Analytics for Neuropsicological test datA) is a modular visual analytics environment developed within the AI-Mind project to explore and analyze data from the Cambridge Neuropsychological Test Automated Battery (CANTAB). Designed in close collaboration with clinical researchers, our system adopts a coordinated multiple-view architecture that integrates components for cohort exploration, data wrangling, group comparison, temporal trajectory analysis, and correlation exploration. Importantly, it leverages the hierarchical structure of neuropsychological data to reduce and manage the inherent complexity of such datasets. Through this combination of views, the tool supports intuitive navigation, interactive filtering, and task-specific workflows. By bridging domain-specific needs with a flexible and extensible design, the system advances visual analytics for neuropsicological research and provides a reusable framework for other contexts involving complex tabular datasets.";

export const HIER_DESC =
  "The Hierarchy Editor enables the organization and structuring of variables into logical groups or derived aggregates. It provides an interactive tree-based interface where variables can be rearranged, nested, or combined to create new higher-level attributes. Each node in the hierarchy can represent an individual variable, a composite indicator, or an aggregation of related measures.\nThis component supports the creation of derived variables using mathematical or logical expressions, allowing the definition of new analytical dimensions tailored to specific research objectives.\nBy simplifying complex datasets into structured hierarchies, the Hierarchy Editor facilitates a clearer overview of cognitive domains and their interrelations, improving both exploration and interpretability.";

export const QUARANTINE_DESC =
  "The Quarantine view isolates selected records for focused inspection and recovery workflows without affecting the active exploration context.";

export const COMP_DESC =
  "The Comparison view allows the analysis of differences between two or more groups for selected variables. It presents group distributions through swarmplots, histograms, or density plots, and includes integrated hypothesis testing to evaluate whether the observed differences are statistically significant. \nDepending on data characteristics, you can apply the appropriate statistical tests, such as t-tests, ANOVA, Mann–Whitney U... For deeper interpretation, you can review p-values, confidence intervals, and effect sizes that quantify both the statistical and practical significance of group differences.";

export const EVO_DESC =
  "The Evolution component visualizes how variables change over time across visits or measurement sessions. It can display both individual trajectories and aggregated group trends, helping identify patterns of improvement, decline, or stability. Multiple variables can be plotted simultaneously to compare their temporal evolution and assess potential correlations. This view supports longitudinal analysis and provides insights into how cognitive performance evolves within and across populations.";

export const CORR_DESC =
  "The Correlation Analysis view examines relationships and dependencies among variables. It integrates multiple coordinated visualizations—such as correlation matrices, scatterplots, and dimensionality reduction techniques (PCA, t-SNE)—to reveal associations, clusters, and redundancies within the data. Color-coded matrices indicate the strength and direction of pairwise correlations, while interactive scatterplots allow detailed inspection of specific variable relationships. This view supports the validation of derived measures and helps uncover structural patterns across cognitive domains.";
