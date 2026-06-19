# Hierarchy Format

VIANNA stores hierarchies as a flat JSON list of nodes that is reconstructed into a tree through parent-child references. This format is designed to support three different concerns at the same time:

- structural organization of attributes into domains or subdomains
- visibility control for analytical views
- optional definition of derived measures through formulas

## Accepted JSON Shape

The hierarchy file must be a JSON array of nodes:

```json
[
  {
    "id": 0,
    "name": "Hierarchy Root",
    "type": "root",
    "dtype": "root",
    "related": [1],
    "isExpanded": true,
    "isActive": true,
    "description": "",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  }
]
```

## Core Model

Each node represents one element in the hierarchy. The hierarchy itself is not stored as nested JSON objects; instead, it is stored as a flat array where each node lists the IDs of its children in the `related` field.

This means the file behaves like an adjacency-list representation of a tree:

- the root node points to top-level groups or attributes
- aggregation nodes point to their child nodes
- leaf attributes typically have `related: []`

## Required Structural Rules

A valid hierarchy should follow these rules:

- it must be a JSON array of nodes
- it must contain exactly one root node with `id: 0`, `type: "root"`, `name: "Hierarchy Root"`, and `dtype: "root"`
- every node must have `id`, `name`, `dtype`, `type`, `related`, `isExpanded`, `isActive`, `description`, and `aggregationConfig`
- `related` must be an array of child node IDs
- node IDs should be unique across the file
- node names should be unique across the file
- every child ID referenced in `related` should exist in the same file
- every non-root node should belong to exactly one parent
- the graph must be acyclic
- every node must be reachable from the root
- `aggregationConfig.usedAttributes` must match the ordered dependencies referenced in `aggregationConfig.formula`
- legacy fields such as `info`, `isShown`, `recover`, and `aggregationConfig.exec` are rejected

VIANNA validates these rules strictly on import. Invalid files are rejected instead of being silently normalized.

## Node Schema

The practical schema used by the application is:

```json
{
  "id": 123,
  "name": "Example Node",
  "type": "attribute",
  "dtype": "number",
  "related": [],
  "isExpanded": true,
  "isActive": true,
  "description": ""
}
```

## Field Reference

### `id`

Unique numeric identifier for the node. Relationships inside the hierarchy are expressed exclusively through these IDs.

### `name`

Human-readable node label. For original variables and derived measures, this also acts as the dataset column name used by the application.

### `type`

Node role within the hierarchy. Supported values are:

- `root`: mandatory root node
- `attribute`: original dataset attribute
- `aggregation`: structural group, derived measure, or both

### `dtype`

Logical data type used by the application. The values used in practice are:

- `root`: root node only
- `number`: numeric variable or numeric derived measure
- `string`: categorical/textual variable or textual derived measure
- `determine`: type not fixed yet, commonly used for structural aggregation nodes

### `related`

Ordered list of child node IDs. Child order is preserved and affects the hierarchy editor and visible traversal order.

### `isExpanded`

Controls whether the node expands into its children or is treated as a terminal visible node in analytical views.

In practice:

- `true` means the view can continue traversing into children
- `false` means the node behaves as collapsed and may become the visible output instead of its descendants

### `description`

Free-text description shown as metadata for the node. Use an empty string when no description is available.

### `isActive`

Activation flag. If `false`, the node is excluded from visibility traversal and interactive use.

### `aggregationConfig`

Canonical configuration object persisted on every node. It is only semantically relevant for aggregation nodes. For non-aggregation nodes it must still be present, using the empty form:

```json
{
  "operation": "concat",
  "formula": "",
  "usedAttributes": []
}
```

## Aggregation Nodes

Aggregation nodes serve two distinct roles in VIANNA:

1. structural grouping nodes used to organize the hierarchy
2. derived measures backed by formulas and materialized as dataset columns

The difference is controlled by the contents of `aggregationConfig`.

### Structural Aggregation

A structural aggregation is a grouping node without a formula. It is used to organize the tree, not to produce a derived column.

Typical example:

```json
{
  "id": 4872616,
  "name": "SocDem",
  "type": "aggregation",
  "dtype": "determine",
  "related": [1, 5, 4, 4209828],
  "isExpanded": true,
  "description": "",
  "aggregationConfig": {
    "operation": "concat",
    "formula": "",
    "usedAttributes": []
  }
}
```

Even though `operation` is present, the node behaves as a structural container when `aggregationConfig.formula` is empty.

### Derived Aggregation

A derived aggregation defines a new variable computed from other attributes. VIANNA compiles `aggregationConfig.formula` to an executable runtime expression when needed; that executable representation is not stored in the persisted hierarchy file.

Typical example:

```json
{
  "id": 4209828,
  "name": "Text Variables",
  "type": "aggregation",
  "dtype": "string",
  "related": [6, 3, 2],
  "isExpanded": true,
  "description": "",
  "aggregationConfig": {
    "operation": "concat",
    "formula": "string($(Visit Name)) + string($(Gender)) + string($(Country))",
    "usedAttributes": [6, 3, 2]
  }
}
```

### `aggregationConfig` Fields

When `type` is `aggregation`, the following fields are relevant:

- `operation`: high-level aggregation mode. Common stored values are `sum`, `mean`, `concat`, and `custom`.
- `formula`: human-readable formula expression
- `usedAttributes`: ordered list of dependent child node IDs

For `mean`, the per-child weights are encoded in `formula` rather than duplicated in `usedAttributes`.

## Formula Semantics

Formulas reference source attributes by name using the `$(...)` notation:

```text
$(Age)
string($(Visit Name))
```

The `formula` field is the persisted source of truth. VIANNA compiles it to an executable runtime expression internally when previewing, importing, or recomputing derived columns.

## Visibility Semantics

Hierarchy nodes are also used to determine which columns are exposed in coordinated analytical views.

The traversal logic is:

- inactive nodes are ignored
- leaves are terminal visible nodes
- collapsed nodes (`isExpanded: false`) are treated as terminal visible nodes
- structural aggregations without a valid formula are not exposed as data columns
- aggregation nodes with a valid formula may be exposed as visible derived measures

This distinction is important: a node can exist in the hierarchy for organization purposes without being a selectable analytical variable.

## Minimal Example

The following example shows a complete minimal hierarchy with one structural group and two original attributes:

```json
[
  {
    "id": 0,
    "name": "Hierarchy Root",
    "type": "root",
    "dtype": "root",
    "related": [100],
    "isExpanded": true,
    "isActive": true,
    "description": "",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 100,
    "name": "Sociodemographic",
    "type": "aggregation",
    "dtype": "determine",
    "related": [10, 11],
    "isExpanded": true,
    "isActive": true,
    "description": "Top-level group for participant context variables",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 10,
    "name": "Age",
    "type": "attribute",
    "dtype": "number",
    "related": [],
    "isExpanded": true,
    "isActive": true,
    "description": "Participant age at visit",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 11,
    "name": "Gender",
    "type": "attribute",
    "dtype": "string",
    "related": [],
    "isExpanded": true,
    "isActive": true,
    "description": "Participant gender",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  }
]
```

## Derived Aggregation Example

The following example shows a hierarchy that includes a derived aggregation node. In this case, the aggregation is not just a structural container: it defines a computed variable that can be exposed as an analytical measure.

```json
[
  {
    "id": 0,
    "name": "Hierarchy Root",
    "type": "root",
    "dtype": "root",
    "related": [100, 200],
    "isExpanded": true,
    "isActive": true,
    "description": "",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 100,
    "name": "Cognitive Measures",
    "type": "aggregation",
    "dtype": "determine",
    "related": [10, 11],
    "isExpanded": true,
    "isActive": true,
    "description": "Source variables used in the derived score",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 10,
    "name": "PAL Score",
    "type": "attribute",
    "dtype": "number",
    "related": [],
    "isExpanded": true,
    "isActive": true,
    "description": "Original PAL score",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 11,
    "name": "PRM Score",
    "type": "attribute",
    "dtype": "number",
    "related": [],
    "isExpanded": true,
    "isActive": true,
    "description": "Original PRM score",
    "aggregationConfig": {
      "operation": "concat",
      "formula": "",
      "usedAttributes": []
    }
  },
  {
    "id": 200,
    "name": "Memory Composite",
    "type": "aggregation",
    "dtype": "number",
    "related": [10, 11],
    "isExpanded": true,
    "isActive": true,
    "description": "Derived composite measure based on two cognitive scores",
    "aggregationConfig": {
      "operation": "mean",
      "formula": "(1 * $(PAL Score) + 1 * $(PRM Score)) / 2",
      "usedAttributes": [10, 11]
    }
  }
]
```

## Recommendations for Authors

- use `attribute` for columns that already exist in the source dataset
- use `aggregation` with empty formula fields for pure structural grouping
- use `aggregation` with populated `aggregationConfig.formula` for derived measures
- keep `name` aligned with the actual dataset column name when the node must be analyzable
- prefer `description` for stable variable documentation, not for transient editor state

## Reference Example

See the bundled sample hierarchy for a full production-style file:

- [`public/vis/hierarchies/ai-mind-demo-hierarchy.json`](../public/vis/hierarchies/ai-mind-demo-hierarchy.json)
