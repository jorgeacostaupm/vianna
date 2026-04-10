import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Settings from "./Settings";
import LassoDock from "./LassoDock";
import ChartWithLegend from "@/components/charts/ChartWithLegend";
import usePCAPlot from "./usePCAPlot";
import usePCAData from "./usePCAData";
import ViewContainer from "@/components/charts/ViewContainer";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";
import { notifyError, notifySuccess, notifyWarning } from "@/notifications";
import { generateFileName, getVariableTypes } from "@/utils/functions";
import { setDataframe, setNavioColumns } from "@/store/features/dataframe";
import { setVarTypes } from "@/store/features/main";
import { addAttribute, updateAttribute } from "@/store/features/metadata";

const DEFAULT_UNASSIGNED_GROUP_NAME = "Unassigned";
const DEFAULT_LASSO_COLUMN_NAME = "pca_lasso_group";
const LASSO_NODE_DESCRIPTION =
  "User-defined PCA stratification derived from interactive lasso-based subgroup delineation.";

const defaultConfig = {
  isSync: true,
  pointSize: 2,
  pointOpacity: 0.75,
  showLegend: true,
  groupVar: null,
  axisLabelFontSize: 16,
};

const defaultParams = {
  groupVar: null,
  variables: [],
  nTop: 10,
};

function toOrderKey(value) {
  return String(value);
}

function isUsableNumericPcaValue(raw) {
  const num = parseFloat(raw);
  return (
    raw != null &&
    typeof raw !== "boolean" &&
    !Number.isNaN(num) &&
    Number.isFinite(num)
  );
}

function buildCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(row?.[column])).join(","),
  );

  return [header, ...body].join("\n");
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows, filenameBase = "pca_groups") {
  const csv = buildCsv(rows);
  if (!csv) return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = generateFileName(filenameBase);
  link.click();
  URL.revokeObjectURL(href);
}

function Chart({ data, id, config, grouping }) {
  const chartRef = useRef(null);
  const legendRef = useRef(null);

  usePCAPlot({ chartRef, legendRef, data, config, grouping });

  return (
    <ChartWithLegend
      id={id}
      chartRef={chartRef}
      legendRef={legendRef}
      showLegend={config.showLegend}
      legendWidthMode="content"
    />
  );
}

export default function PCA({ id, remove, sourceOrderValues = [] }) {
  const dispatch = useDispatch();
  const groupVar = useSelector((s) => s.correlation.groupVar);
  const selection = useSelector((s) => s.dataframe.selection);
  const fullData = useSelector((s) => s.dataframe.dataframe);
  const navioColumns = useSelector((s) => s.dataframe.navioColumns || []);
  const metadataAttributes = useSelector((s) => s.metadata.attributes || []);

  const [config, setConfig] = useState(defaultConfig);
  const [params, setParams] = useState(defaultParams);
  const [info, setInfo] = useState(null);
  const [data] = usePCAData(config.isSync, params, setInfo);
  const dockAnchorRef = useRef(null);

  const invalidCountsByVariable = useMemo(() => {
    const rows = Array.isArray(selection) ? selection : [];
    const columns = Array.isArray(navioColumns) ? navioColumns : [];

    const counts = {};
    columns.forEach((columnName) => {
      let invalidCount = 0;
      rows.forEach((row) => {
        if (!isUsableNumericPcaValue(row?.[columnName])) {
          invalidCount += 1;
        }
      });
      counts[columnName] = invalidCount;
    });

    return counts;
  }, [selection, navioColumns]);

  const validPcaVariables = useMemo(() => {
    const vars = Array.isArray(params.variables) ? params.variables : [];
    return vars.filter((name) => (invalidCountsByVariable[name] ?? 0) === 0);
  }, [params.variables, invalidCountsByVariable]);

  const warnedInvalidVariablesRef = useRef(new Set());
  const previousVariablesRef = useRef([]);

  useEffect(() => {
    const currentVariables = Array.isArray(params.variables) ? params.variables : [];
    const prevVariables = new Set(previousVariablesRef.current);

    currentVariables
      .filter((variableName) => !prevVariables.has(variableName))
      .forEach((variableName) => {
        const invalidCount = invalidCountsByVariable[variableName] ?? 0;
        if (invalidCount <= 0) return;

        if (!warnedInvalidVariablesRef.current.has(variableName)) {
          warnedInvalidVariablesRef.current.add(variableName);
          notifyWarning({
            message: "Variable not used in PCA",
            description: `Column "${variableName}" has ${invalidCount} invalid values and was excluded.`,
            placement: "bottomRight",
          });
        }
      });

    previousVariablesRef.current = currentVariables;
  }, [params.variables, invalidCountsByVariable]);

  const liveOrderValues = useMemo(() => {
    if ((selection || []).length < 2 || validPcaVariables.length < 2) return [];
    return extractOrderValues(selection);
  }, [selection, validPcaVariables]);

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const [lassoBuilder, setLassoBuilder] = useState({
    enabled: false,
    targetColumn: "",
    groups: [],
    activeGroupId: null,
    selectionMode: "add",
    assignments: {},
    unassignedGroupName: DEFAULT_UNASSIGNED_GROUP_NAME,
  });

  const lassoGroupCounterRef = useRef(1);

  const datasetColumns = useMemo(() => {
    const firstRow = Array.isArray(fullData) && fullData.length > 0 ? fullData[0] : null;
    return firstRow ? Object.keys(firstRow) : [];
  }, [fullData]);

  const assignmentCountsByGroup = useMemo(() => {
    const counts = {};
    const validOrders = new Set(
      (Array.isArray(data) ? data : []).map((row) => toOrderKey(row?.[ORDER_VARIABLE]))
    );

    Object.entries(lassoBuilder.assignments || {}).forEach(([orderKey, groupId]) => {
      if (!validOrders.has(orderKey)) return;
      counts[groupId] = (counts[groupId] || 0) + 1;
    });

    return counts;
  }, [data, lassoBuilder.assignments]);

  const unassignedVisibleCount = useMemo(() => {
    const visibleRows = Array.isArray(data) ? data : [];
    if (!visibleRows.length) return 0;

    return visibleRows.reduce((count, row) => {
      const orderKey = toOrderKey(row?.[ORDER_VARIABLE]);
      return count + (lassoBuilder.assignments[orderKey] == null ? 1 : 0);
    }, 0);
  }, [data, lassoBuilder.assignments]);

  const handleAddVisibleVariables = useCallback(() => {
    const visibleVariables = Array.isArray(navioColumns) ? navioColumns : [];
    setParams((prev) => ({
      ...prev,
      variables: [...new Set([...(prev.variables || []), ...visibleVariables])],
    }));
  }, [navioColumns]);

  const handleStartLassoMode = useCallback(() => {
    const suggestedName = lassoBuilder.targetColumn || DEFAULT_LASSO_COLUMN_NAME;
    const inputName = window.prompt(
      "Name for the new grouping column:",
      suggestedName,
    );

    if (inputName == null) return;

    const columnName = inputName.trim();
    if (!columnName) {
      notifyWarning({
        message: "Missing column name",
        description: "Please provide a valid column name to create PCA groups.",
      });
      return;
    }

    if (datasetColumns.includes(columnName)) {
      notifyWarning({
        message: "Column already exists",
        description: `The column "${columnName}" already exists. Choose another name.`,
      });
      return;
    }

    setLassoBuilder((prev) => {
      if (prev.enabled && prev.targetColumn === columnName) return prev;

      const nextGroups =
        prev.groups.length > 0
          ? prev.groups
          : [{ id: `lasso-group-${lassoGroupCounterRef.current++}`, name: "Group 1" }];

      const nextActiveGroupId =
        prev.activeGroupId != null
          ? prev.activeGroupId
          : nextGroups[0]?.id || null;

      return {
        ...prev,
        enabled: true,
        targetColumn: columnName,
        groups: nextGroups,
        activeGroupId: nextActiveGroupId,
      };
    });
  }, [lassoBuilder.targetColumn, datasetColumns]);

  const handleStopLassoMode = useCallback(() => {
    setLassoBuilder((prev) => ({
      ...prev,
      enabled: false,
    }));
  }, []);

  const handleAddLassoGroup = useCallback(() => {
    setLassoBuilder((prev) => {
      const id = `lasso-group-${lassoGroupCounterRef.current++}`;
      const groupName = `Group ${prev.groups.length + 1}`;
      return {
        ...prev,
        groups: [...prev.groups, { id, name: groupName }],
        activeGroupId: id,
      };
    });
  }, []);

  const handleRenameLassoGroup = useCallback((groupId, name) => {
    setLassoBuilder((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    }));
  }, []);

  const handleSetActiveLassoGroup = useCallback((groupId) => {
    setLassoBuilder((prev) => ({
      ...prev,
      activeGroupId: groupId,
    }));
  }, []);

  const handleSelectionModeChange = useCallback((selectionMode) => {
    setLassoBuilder((prev) => ({
      ...prev,
      selectionMode,
    }));
  }, []);

  const handleUnassignedGroupNameChange = useCallback((unassignedGroupName) => {
    setLassoBuilder((prev) => ({
      ...prev,
      unassignedGroupName,
    }));
  }, []);

  const handleClearAssignments = useCallback(() => {
    setLassoBuilder((prev) => ({
      ...prev,
      assignments: {},
    }));
  }, []);

  const handlePointToggle = useCallback((orderValue) => {
    const orderKey = toOrderKey(orderValue);

    setLassoBuilder((prev) => {
      if (!prev.activeGroupId) return prev;

      const assignments = { ...prev.assignments };
      if (assignments[orderKey] === prev.activeGroupId) {
        delete assignments[orderKey];
      } else {
        assignments[orderKey] = prev.activeGroupId;
      }

      return {
        ...prev,
        assignments,
      };
    });
  }, []);

  const handleLassoSelection = useCallback((orderValues, mode) => {
    if (!Array.isArray(orderValues) || orderValues.length === 0) return;

    setLassoBuilder((prev) => {
      if (!prev.activeGroupId) return prev;

      const assignments = { ...prev.assignments };
      orderValues.forEach((orderValue) => {
        const orderKey = toOrderKey(orderValue);

        if (mode === "remove") {
          if (assignments[orderKey] === prev.activeGroupId) {
            delete assignments[orderKey];
          }
          return;
        }

        assignments[orderKey] = prev.activeGroupId;
      });

      return {
        ...prev,
        assignments,
      };
    });
  }, []);

  const resolveGroupNameById = useMemo(() => {
    const nameById = new Map();
    lassoBuilder.groups.forEach((group, index) => {
      const normalizedName = group?.name?.trim() || `Group ${index + 1}`;
      nameById.set(group.id, normalizedName);
    });
    return nameById;
  }, [lassoBuilder.groups]);

  const buildRowsWithGroupColumn = useCallback(
    (rows) => {
      if (!Array.isArray(rows) || !lassoBuilder.targetColumn) return [];

      const unassignedName =
        lassoBuilder.unassignedGroupName?.trim() || DEFAULT_UNASSIGNED_GROUP_NAME;

      return rows.map((row) => {
        const orderKey = toOrderKey(row?.[ORDER_VARIABLE]);
        const groupId = lassoBuilder.assignments[orderKey];
        const label = resolveGroupNameById.get(groupId) || unassignedName;

        return {
          ...row,
          [lassoBuilder.targetColumn]: label,
        };
      });
    },
    [
      lassoBuilder.assignments,
      lassoBuilder.targetColumn,
      lassoBuilder.unassignedGroupName,
      resolveGroupNameById,
    ],
  );

  const upsertLassoNodeInHierarchy = useCallback(
    async (columnName) => {
      const attributes = Array.isArray(metadataAttributes)
        ? metadataAttributes
        : [];
      const existingNode = attributes.find((node) => node?.name === columnName);

      if (existingNode) {
        await dispatch(
          updateAttribute({
            id: existingNode.id,
            name: columnName,
            type: "attribute",
            dtype: "string",
            desc: LASSO_NODE_DESCRIPTION,
            recover: false,
          }),
        ).unwrap();
        return;
      }

      const rootNode =
        attributes.find((node) => node?.type === "root") ||
        attributes.find((node) => node?.id === 0);
      const parentID = rootNode?.id ?? 0;
      const maxId = attributes.reduce(
        (acc, node) => Math.max(acc, Number(node?.id) || 0),
        0,
      );
      const newId = maxId + 1;

      await dispatch(
        addAttribute({
          id: newId,
          name: columnName,
          type: "attribute",
          parentID,
          dtype: "string",
          recover: false,
        }),
      ).unwrap();

      await dispatch(
        updateAttribute({
          id: newId,
          name: columnName,
          type: "attribute",
          dtype: "string",
          desc: LASSO_NODE_DESCRIPTION,
          recover: false,
        }),
      ).unwrap();
    },
    [dispatch, metadataAttributes],
  );

  const handleApplyLassoToDataset = useCallback(async () => {
    if (!lassoBuilder.targetColumn) {
      notifyWarning({
        message: "No target column",
        description: "Start lasso mode and set a target column name first.",
      });
      return;
    }

    if (!Array.isArray(fullData) || fullData.length === 0) {
      notifyWarning({
        message: "No data available",
        description: "No dataset rows are available to update.",
      });
      return;
    }

    try {
      const updatedRows = buildRowsWithGroupColumn(fullData);
      dispatch(setDataframe(updatedRows));

      const nextNavioColumns = uniqueColumns([
        ...(Array.isArray(navioColumns) ? navioColumns : []),
        lassoBuilder.targetColumn,
      ]);
      dispatch(setNavioColumns(nextNavioColumns));

      const nextVarTypes = getVariableTypes(updatedRows);
      nextVarTypes[lassoBuilder.targetColumn] = "string";
      dispatch(setVarTypes(nextVarTypes));

      await upsertLassoNodeInHierarchy(lassoBuilder.targetColumn);

      notifySuccess({
        message: "PCA groups saved",
        description: `Column "${lassoBuilder.targetColumn}" was added to data and hierarchy as a categorical original node.`,
      });
    } catch (error) {
      notifyError({
        message: "Could not save PCA groups",
        error,
        fallback:
          "Failed to persist PCA lasso groups into dataset and hierarchy.",
      });
    }
  }, [
    buildRowsWithGroupColumn,
    dispatch,
    fullData,
    lassoBuilder.targetColumn,
    navioColumns,
    upsertLassoNodeInHierarchy,
  ]);

  const handleDownloadGroupedData = useCallback(() => {
    if (!lassoBuilder.targetColumn) {
      notifyWarning({
        message: "No target column",
        description: "Start lasso mode and set a target column name first.",
      });
      return;
    }

    const rows = buildRowsWithGroupColumn(fullData || []);
    if (!rows.length) {
      notifyWarning({
        message: "No rows to download",
        description: "There is no grouped data to export.",
      });
      return;
    }

    downloadCsv(rows, `${lassoBuilder.targetColumn}_preview`);
  }, [buildRowsWithGroupColumn, fullData, lassoBuilder.targetColumn]);

  const requiredVariables = useMemo(
    () =>
      uniqueColumns([
        groupVar,
        ...params.variables,
        lassoBuilder.targetColumn || null,
        ORDER_VARIABLE,
      ]),
    [groupVar, params.variables, lassoBuilder.targetColumn],
  );

  useEffect(() => {
    setConfig((prev) =>
      prev.groupVar === groupVar ? prev : { ...prev, groupVar }
    );
  }, [groupVar]);

  const groupingConfig = useMemo(
    () => ({
      enabled: lassoBuilder.enabled,
      activeGroupId: lassoBuilder.activeGroupId,
      selectionMode: lassoBuilder.selectionMode,
      assignments: lassoBuilder.assignments,
      onPointToggle: handlePointToggle,
      onLassoSelection: handleLassoSelection,
    }),
    [
      handleLassoSelection,
      handlePointToggle,
      lassoBuilder.activeGroupId,
      lassoBuilder.assignments,
      lassoBuilder.enabled,
      lassoBuilder.selectionMode,
    ],
  );

  const chart = useMemo(() => {
    return (
      <div ref={dockAnchorRef} style={{ width: "100%", height: "100%" }}>
        <Chart data={data} config={config} id={id} grouping={groupingConfig} />
        <LassoDock
          enabled={lassoBuilder.enabled}
          anchorRef={dockAnchorRef}
          targetColumn={lassoBuilder.targetColumn}
          groups={lassoBuilder.groups}
          activeGroupId={lassoBuilder.activeGroupId}
          selectionMode={lassoBuilder.selectionMode}
          assignmentCountsByGroup={assignmentCountsByGroup}
          unassignedVisibleCount={unassignedVisibleCount}
          unassignedGroupName={lassoBuilder.unassignedGroupName}
          onStop={handleStopLassoMode}
          onSelectionModeChange={handleSelectionModeChange}
          onAddGroup={handleAddLassoGroup}
          onClearAssignments={handleClearAssignments}
          onSetActiveGroup={handleSetActiveLassoGroup}
          onRenameGroup={handleRenameLassoGroup}
          onUnassignedGroupNameChange={handleUnassignedGroupNameChange}
          onApplyToDataset={handleApplyLassoToDataset}
          onDownload={handleDownloadGroupedData}
        />
      </div>
    );
  }, [
    assignmentCountsByGroup,
    config,
    data,
    groupingConfig,
    handleAddLassoGroup,
    handleApplyLassoToDataset,
    handleClearAssignments,
    handleDownloadGroupedData,
    handleRenameLassoGroup,
    handleSelectionModeChange,
    handleSetActiveLassoGroup,
    handleStopLassoMode,
    handleUnassignedGroupNameChange,
    id,
    lassoBuilder.activeGroupId,
    lassoBuilder.enabled,
    lassoBuilder.groups,
    lassoBuilder.selectionMode,
    lassoBuilder.targetColumn,
    lassoBuilder.unassignedGroupName,
    unassignedVisibleCount,
  ]);

  return (
    <ViewContainer
      title={`PCA · ${params.variables.length} Variables`}
      svgIDs={[id, `${id}-legend`]}
      remove={remove}
      settings={
        <Settings
          config={config}
          setConfig={setConfig}
          params={params}
          setParams={setParams}
          invalidCountsByVariable={invalidCountsByVariable}
          onAddVisibleVariables={handleAddVisibleVariables}
          isLassoEnabled={lassoBuilder.enabled}
          lassoTargetColumn={lassoBuilder.targetColumn}
          onStartLassoMode={handleStartLassoMode}
          onStopLassoMode={handleStopLassoMode}
        />
      }
      chart={chart}
      config={config}
      setConfig={setConfig}
      info={info}
      recordsExport={{
        filename: "pca",
        recordOrders,
        requiredVariables,
      }}
    />
  );
}
