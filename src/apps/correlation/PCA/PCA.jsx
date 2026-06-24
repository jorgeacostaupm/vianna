import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";

import Settings from "./Settings";
import LassoDock from "./LassoDock";
import createD3Chart from "@/components/charts/createD3Chart";
import usePCAPlot from "./usePCAPlot";
import usePCAData from "./usePCAData";
import ViewContainer from "@/components/charts/ViewContainer";
import { createViewModel } from "@/components/charts/view/createViewModel";
import { ORDER_VARIABLE } from "@/utils/constants";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import useSelectionRows from "@/hooks/useSelectionRows";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";
import {
  notifyError,
  notifySuccess,
  notifyWarning,
} from "@/components/notifications";
import { generateFileName, getVariableTypes } from "@/utils/functions";
import { toCsv } from "@/utils/csv";
import { setDataframe, setNavioColumns } from "@/store/features/dataframe";
import {
  selectCorrelationAnalysisContext,
  setVarTypes,
} from "@/store/features/main";
import { addAttribute, updateAttribute } from "@/store/features/metadata";
import {
  DEFAULT_UNASSIGNED_GROUP_NAME,
  initialLassoState,
  isLassoEnabled,
  lassoReducer,
} from "./lassoState";
import { pcaDefaultConfig, pcaDefaultParams } from "./pcaDefaults";
import useWorkspaceBackedState from "@/hooks/useWorkspaceBackedState";

const DEFAULT_LASSO_COLUMN_NAME = "pca_lasso_group";
const LASSO_NODE_DESCRIPTION =
  "User-defined PCA stratification derived from interactive lasso-based subgroup delineation.";

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

function downloadCsv(rows, filenameBase = "pca_groups") {
  const csv = toCsv(rows, Object.keys(rows?.[0] || {}));
  if (!csv) return;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = generateFileName(filenameBase);
  link.click();
  URL.revokeObjectURL(href);
}

const Chart = createD3Chart(usePCAPlot);

export default function PCA({
  id,
  remove,
  sourceOrderValues = [],
  config: persistedConfig,
  params: persistedParams,
  updateView,
}) {
  const dispatch = useDispatch();
  const { groupVar } = useSelector(selectCorrelationAnalysisContext);
  const fullData = useSelector((s) => s.dataframe.dataframe);
  const navioColumns = useSelector((s) => s.dataframe.navioColumns || []);
  const metadataAttributes = useSelector((s) => s.metadata.attributes || []);
  const selectionColumns = useMemo(
    () =>
      uniqueColumns([
        ...(Array.isArray(navioColumns) ? navioColumns : []),
        ORDER_VARIABLE,
      ]),
    [Array.isArray(navioColumns) ? navioColumns.join("|") : ""],
  );
  const selection = useSelectionRows(selectionColumns);

  const handleConfigChange = useCallback(
    (nextConfig) => updateView?.({ config: nextConfig }),
    [updateView],
  );
  const handleParamsChange = useCallback(
    (nextParams) => updateView?.({ params: nextParams }),
    [updateView],
  );
  const [config, setConfig] = useWorkspaceBackedState({
    defaultValue: pcaDefaultConfig,
    persistedValue: persistedConfig,
    onChange: handleConfigChange,
  });
  const [params, setParams] = useWorkspaceBackedState({
    defaultValue: pcaDefaultParams,
    persistedValue: persistedParams,
    onChange: handleParamsChange,
  });
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
    const currentVariables = Array.isArray(params.variables)
      ? params.variables
      : [];
    const prevVariables = new Set(previousVariablesRef.current);

    currentVariables
      .filter((variableName) => !prevVariables.has(variableName))
      .forEach((variableName) => {
        const invalidCount = invalidCountsByVariable[variableName] ?? 0;
        if (invalidCount <= 0) return;

        if (!warnedInvalidVariablesRef.current.has(variableName)) {
          warnedInvalidVariablesRef.current.add(variableName);
          notifyWarning({
            message: "Attribute not used in PCA",
            description: `Attribute "${variableName}" has ${invalidCount} invalid values and was excluded.`,
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

  const [lassoState, lassoDispatch] = useReducer(
    lassoReducer,
    initialLassoState,
  );
  const lassoEnabled = isLassoEnabled(lassoState);

  const datasetColumns = useMemo(() => {
    const firstRow =
      Array.isArray(fullData) && fullData.length > 0 ? fullData[0] : null;
    return firstRow ? Object.keys(firstRow) : [];
  }, [fullData]);

  const assignmentCountsByGroup = useMemo(() => {
    const counts = {};
    const validOrders = new Set(
      (Array.isArray(data) ? data : []).map((row) =>
        toOrderKey(row?.[ORDER_VARIABLE]),
      ),
    );

    Object.entries(lassoState.assignments || {}).forEach(
      ([orderKey, groupId]) => {
        if (!validOrders.has(orderKey)) return;
        counts[groupId] = (counts[groupId] || 0) + 1;
      },
    );

    return counts;
  }, [data, lassoState.assignments]);

  const unassignedVisibleCount = useMemo(() => {
    const visibleRows = Array.isArray(data) ? data : [];
    if (!visibleRows.length) return 0;

    return visibleRows.reduce((count, row) => {
      const orderKey = toOrderKey(row?.[ORDER_VARIABLE]);
      return count + (lassoState.assignments[orderKey] == null ? 1 : 0);
    }, 0);
  }, [data, lassoState.assignments]);

  const handleAddVisibleVariables = useCallback(() => {
    const visibleVariables = Array.isArray(navioColumns) ? navioColumns : [];
    setParams((prev) => ({
      ...prev,
      variables: [...new Set([...(prev.variables || []), ...visibleVariables])],
    }));
  }, [navioColumns]);

  const handleStartLassoMode = useCallback(() => {
    const suggestedName = lassoState.targetColumn || DEFAULT_LASSO_COLUMN_NAME;
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

    lassoDispatch({
      type: "START",
      payload: { targetColumn: columnName },
    });
  }, [datasetColumns, lassoState.targetColumn]);

  const handleStopLassoMode = useCallback(() => {
    lassoDispatch({ type: "STOP" });
  }, []);

  const handleAddLassoGroup = useCallback(() => {
    lassoDispatch({ type: "ADD_GROUP" });
  }, []);

  const handleRenameLassoGroup = useCallback((groupId, name) => {
    lassoDispatch({
      type: "RENAME_GROUP",
      payload: { groupId, name },
    });
  }, []);

  const handleSetActiveLassoGroup = useCallback((groupId) => {
    lassoDispatch({
      type: "SET_ACTIVE_GROUP",
      payload: { groupId },
    });
  }, []);

  const handleSelectionModeChange = useCallback((selectionMode) => {
    lassoDispatch({
      type: "SET_SELECTION_MODE",
      payload: { selectionMode },
    });
  }, []);

  const handleUnassignedGroupNameChange = useCallback((unassignedGroupName) => {
    lassoDispatch({
      type: "SET_UNASSIGNED_NAME",
      payload: { unassignedGroupName },
    });
  }, []);

  const handleClearAssignments = useCallback(() => {
    lassoDispatch({ type: "CLEAR_ASSIGNMENTS" });
  }, []);

  const handlePointToggle = useCallback((orderValue) => {
    const orderKey = toOrderKey(orderValue);
    lassoDispatch({
      type: "TOGGLE_POINT",
      payload: { orderKey },
    });
  }, []);

  const handleLassoSelection = useCallback((orderValues, mode) => {
    if (!Array.isArray(orderValues) || orderValues.length === 0) return;
    lassoDispatch({
      type: "APPLY_SELECTION",
      payload: {
        orderKeys: orderValues.map((orderValue) => toOrderKey(orderValue)),
        mode,
      },
    });
  }, []);

  const resolveGroupNameById = useMemo(() => {
    const nameById = new Map();
    lassoState.groups.forEach((group, index) => {
      const normalizedName = group?.name?.trim() || `Group ${index + 1}`;
      nameById.set(group.id, normalizedName);
    });
    return nameById;
  }, [lassoState.groups]);

  const buildRowsWithGroupColumn = useCallback(
    (rows) => {
      if (!Array.isArray(rows) || !lassoState.targetColumn) return [];

      const unassignedName =
        lassoState.unassignedGroupName?.trim() || DEFAULT_UNASSIGNED_GROUP_NAME;

      return rows.map((row) => {
        const orderKey = toOrderKey(row?.[ORDER_VARIABLE]);
        const groupId = lassoState.assignments[orderKey];
        const label = resolveGroupNameById.get(groupId) || unassignedName;

        return {
          ...row,
          [lassoState.targetColumn]: label,
        };
      });
    },
    [
      lassoState.assignments,
      lassoState.targetColumn,
      lassoState.unassignedGroupName,
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
            description: LASSO_NODE_DESCRIPTION,
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
          description: LASSO_NODE_DESCRIPTION,
          recover: false,
        }),
      ).unwrap();
    },
    [dispatch, metadataAttributes],
  );

  const handleApplyLassoToDataset = useCallback(async () => {
    if (!lassoState.targetColumn) {
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
        lassoState.targetColumn,
      ]);
      dispatch(setNavioColumns(nextNavioColumns));

      const nextVarTypes = getVariableTypes(updatedRows);
      nextVarTypes[lassoState.targetColumn] = "string";
      dispatch(setVarTypes(nextVarTypes));

      await upsertLassoNodeInHierarchy(lassoState.targetColumn);

      notifySuccess({
        message: "PCA groups saved",
        description: `Column "${lassoState.targetColumn}" was added to data and hierarchy as a categorical original node.`,
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
    lassoState.targetColumn,
    navioColumns,
    upsertLassoNodeInHierarchy,
  ]);

  const handleDownloadGroupedData = useCallback(() => {
    if (!lassoState.targetColumn) {
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

    downloadCsv(rows, `${lassoState.targetColumn}_preview`);
  }, [buildRowsWithGroupColumn, fullData, lassoState.targetColumn]);

  const requiredVariables = useMemo(
    () =>
      uniqueColumns([
        groupVar,
        ...params.variables,
        lassoState.targetColumn || null,
        ORDER_VARIABLE,
      ]),
    [groupVar, params.variables, lassoState.targetColumn],
  );

  useEffect(() => {
    setConfig((prev) =>
      prev.groupVar === groupVar ? prev : { ...prev, groupVar },
    );
  }, [groupVar]);

  const groupingConfig = useMemo(
    () => ({
      enabled: lassoEnabled,
      activeGroupId: lassoState.activeGroupId,
      selectionMode: lassoState.selectionMode,
      assignments: lassoState.assignments,
      onPointToggle: handlePointToggle,
      onLassoSelection: handleLassoSelection,
    }),
    [
      handleLassoSelection,
      handlePointToggle,
      lassoEnabled,
      lassoState.activeGroupId,
      lassoState.assignments,
      lassoState.selectionMode,
    ],
  );

  const chart = useMemo(() => {
    return (
      <div ref={dockAnchorRef} style={{ width: "100%", height: "100%" }}>
        <Chart data={data} config={config} id={id} grouping={groupingConfig} />
        <LassoDock
          enabled={lassoEnabled}
          anchorRef={dockAnchorRef}
          targetColumn={lassoState.targetColumn}
          groups={lassoState.groups}
          activeGroupId={lassoState.activeGroupId}
          selectionMode={lassoState.selectionMode}
          assignmentCountsByGroup={assignmentCountsByGroup}
          unassignedVisibleCount={unassignedVisibleCount}
          unassignedGroupName={lassoState.unassignedGroupName}
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
    lassoEnabled,
    lassoState.activeGroupId,
    lassoState.groups,
    lassoState.selectionMode,
    lassoState.targetColumn,
    lassoState.unassignedGroupName,
    unassignedVisibleCount,
  ]);

  const viewModel = createViewModel({
    title: `PCA · ${params.variables.length} Attributes`,
    svgIDs: [id],
    remove,
    settings: (
      <Settings
        config={config}
        setConfig={setConfig}
        params={params}
        setParams={setParams}
        invalidCountsByVariable={invalidCountsByVariable}
        onAddVisibleVariables={handleAddVisibleVariables}
        isLassoEnabled={lassoEnabled}
        lassoTargetColumn={lassoState.targetColumn}
        onStartLassoMode={handleStartLassoMode}
        onStopLassoMode={handleStopLassoMode}
      />
    ),
    chart,
    config,
    setConfig,
    info,
    recordsExport: {
      filename: "pca",
      recordOrders,
      requiredVariables,
    },
  });

  return <ViewContainer view={viewModel} />;
}
