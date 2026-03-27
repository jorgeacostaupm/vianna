import React, { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Typography, Divider, Button, Space, Tag } from "antd";
import { DiffOutlined, SisternodeOutlined } from "@ant-design/icons";
import * as aq from "arquero";
import DragDropHierarchy from "../DragDrop/DragDropHierarchy";
import {
  selectNumericNodes,
  selectTextNodes,
  selectDetermineNodes,
  selectAggregationNodes,
} from "@/store/selectors/metaSelectors";
import { selectNavioVars } from "@/store/slices/cantabSlice";
import { addAttribute, removeAttribute } from "@/store/async/metaAsyncReducers";
import { getRandomInt } from "@/utils/functions";
import { HIDDEN_VARIABLES, VariableTypes } from "@/utils/Constants";
import {
  buildListResultDescription,
  formatListPreview,
  notify,
  notifyError,
  notifyInfo,
} from "@/utils/notifications";
import styles from "../Data.module.css";

const { Title, Text } = Typography;

const getDataframeVariables = (dataframe) => {
  if (!Array.isArray(dataframe) || dataframe.length === 0) return [];
  return aq
    .from(dataframe)
    .columnNames()
    .filter((column) => !HIDDEN_VARIABLES.includes(column));
};

const mapVarTypeToNodeDtype = (varType) => {
  if (!varType || varType === VariableTypes.UNKNOWN) {
    return "determine";
  }
  return varType;
};

const SyncPanel = () => {
  const dispatch = useDispatch();
  const dataframe = useSelector((state) => state.dataframe.present.dataframe);
  const hierarchy = useSelector((state) => state.metadata.attributes);
  const varTypes = useSelector((state) => state.cantab.present.varTypes || {});
  const [actionLoading, setActionLoading] = useState(null);
  const [actionProgress, setActionProgress] = useState({
    mode: null,
    completed: 0,
    total: 0,
  });

  const {
    datasetVars,
    missingVars,
    extraAttributeNodes,
    extraAggregationNodes,
    hierarchyNodes,
    aggregationNodesWithoutFormula,
    hasRootNode,
  } = useMemo(() => {
    const hierarchyNodes = (hierarchy || []).filter((n) => n.type !== "root");
    const aggregationNodeNames = [
      ...new Set(
        hierarchyNodes
          .filter((node) => node.type === "aggregation")
          .map((node) => node.name),
      ),
    ];
    const datasetVars = getDataframeVariables(dataframe).filter(
      (varName) => !aggregationNodeNames.includes(varName),
    );
    const hasRootNode = (hierarchy || []).some(
      (n) => n.type === "root" && n.id === 0,
    );
    const hierarchyNodeNames = [...new Set(hierarchyNodes.map((n) => n.name))];
    const missingVars = datasetVars.filter(
      (varName) => !hierarchyNodeNames.includes(varName),
    );

    return {
      datasetVars,
      hasRootNode,
      missingVars,
      hierarchyNodes,
      aggregationNodesWithoutFormula: hierarchyNodes.filter(
        (node) =>
          node.type === "aggregation" &&
          (typeof node?.info?.exec !== "string" ||
            node.info.exec.trim() === ""),
      ),
      extraAttributeNodes: hierarchyNodes.filter(
        (node) => node.type === "attribute" && !datasetVars.includes(node.name),
      ),
      extraAggregationNodes: hierarchyNodes.filter(
        (node) =>
          node.type === "aggregation" && !datasetVars.includes(node.name),
      ),
    };
  }, [dataframe, hierarchy]);

  const hasDataset = datasetVars.length > 0;
  const isCoordinated =
    hasDataset &&
    missingVars.length === 0 &&
    extraAttributeNodes.length === 0 &&
    extraAggregationNodes.length === 0;

  const handleAddMissingNodes = useCallback(async () => {
    if (missingVars.length === 0) {
      notifyInfo({
        message: "No missing nodes",
        description: "Hierarchy already contains all dataset variables.",
      });
      return;
    }

    if (!hasRootNode) {
      notifyError({
        message: "Cannot add missing nodes",
        description:
          "The hierarchy root node (id: 0, type: root) is missing. Upload a valid hierarchy first.",
      });
      return;
    }

    setActionLoading("add");
    setActionProgress({ mode: "add", completed: 0, total: missingVars.length });
    const added = [];
    const failed = [];

    for (const varName of missingVars) {
      try {
        await dispatch(
          addAttribute({
            parentID: 0,
            id: getRandomInt(),
            name: varName,
            type: "attribute",
            dtype: mapVarTypeToNodeDtype(varTypes[varName]),
          }),
        ).unwrap();
        added.push(varName);
      } catch {
        failed.push(varName);
      }
      setActionProgress((prev) => ({
        ...prev,
        completed: prev.completed + 1,
      }));
    }

    setActionLoading(null);
    setActionProgress({ mode: null, completed: 0, total: 0 });

    notify({
      message:
        failed.length === 0
          ? "Missing nodes added"
          : "Missing nodes added with warnings",
      description: buildListResultDescription({
        successLabel: "Added",
        successItems: added,
        failureItems: failed,
        maxItems: 12,
      }),
      type: failed.length === 0 ? "success" : "warning",
      pauseOnHover: true,
      duration: 5,
    });
  }, [dispatch, hasRootNode, missingVars, varTypes]);

  const handleRemoveExtraNodes = useCallback(async () => {
    if (extraAttributeNodes.length === 0) {
      notifyInfo({
        message: "No removable extra nodes",
        description:
          "There are no extra attribute nodes. Aggregations are not removed automatically.",
      });
      return;
    }

    setActionLoading("remove");
    setActionProgress({
      mode: "remove",
      completed: 0,
      total: extraAttributeNodes.length,
    });
    const removed = [];
    const failed = [];

    for (const node of extraAttributeNodes) {
      try {
        await dispatch(
          removeAttribute({
            attributeID: node.id,
            recover: true,
          }),
        ).unwrap();
        removed.push(node.name);
      } catch {
        failed.push(node.name);
      }
      setActionProgress((prev) => ({
        ...prev,
        completed: prev.completed + 1,
      }));
    }

    setActionLoading(null);
    setActionProgress({ mode: null, completed: 0, total: 0 });

    notify({
      message:
        failed.length === 0
          ? "Extra attribute nodes removed"
          : "Extra node cleanup completed with warnings",
      description: buildListResultDescription({
        successLabel: "Removed",
        successItems: removed,
        failureItems: failed,
        maxItems: 12,
      }),
      type: failed.length === 0 ? "success" : "warning",
      pauseOnHover: true,
      duration: 5,
    });
  }, [dispatch, extraAttributeNodes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Status:
        </Text>
        <Tag color={isCoordinated ? "success" : "warning"}>
          {isCoordinated ? "Coordinated" : "Needs review"}
        </Tag>
      </div>

      {!hasDataset ? (
        <Text type="secondary">
          Upload data first to evaluate missing and extra hierarchy nodes.
        </Text>
      ) : (
        <>
          <div>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Original Attributes:
            </Text>{" "}
            <Text type="secondary">{datasetVars.length}</Text>
          </div>
          <div>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Hierarchy Attributes:
            </Text>{" "}
            <Text type="secondary">{hierarchyNodes.length}</Text>
          </div>
          <div>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Nodes in Data not Hierarchy:
            </Text>{" "}
            <Text type="secondary">{missingVars.length}</Text>
          </div>
          <div>
            <Text strong style={{ color: "var(--primary-color)" }}>
              Nodes without formula:
            </Text>{" "}
            <Text type="secondary">
              {aggregationNodesWithoutFormula.length}
            </Text>
          </div>
          {missingVars.length > 0 ? (
            <div>
              <Text strong style={{ color: "var(--primary-color)" }}>
                Missing Attributes in Hierarchy:
              </Text>{" "}
              <Text type="secondary">
                {formatListPreview(missingVars, 12, "—")}
              </Text>
            </div>
          ) : null}
          {extraAttributeNodes.length > 0 ? (
            <div>
              <Text strong style={{ color: "var(--primary-color)" }}>
                Extra attributes:
              </Text>{" "}
              <Text type="secondary">
                {formatListPreview(
                  extraAttributeNodes.map((node) => node.name),
                  12,
                  "—",
                )}
              </Text>
            </div>
          ) : null}
          {aggregationNodesWithoutFormula.length > 0 ? (
            <div>
              <Text strong style={{ color: "var(--primary-color)" }}>
                Nodes without formula:
              </Text>{" "}
              <Text type="secondary">
                {formatListPreview(
                  aggregationNodesWithoutFormula.map((node) => node.name),
                  12,
                  "—",
                )}
              </Text>
            </div>
          ) : null}
          <Space wrap>
            <Button
              icon={<DiffOutlined />}
              onClick={handleAddMissingNodes}
              loading={actionLoading === "add"}
              disabled={missingVars.length === 0 || actionLoading != null}
            >
              Add Missing Nodes
            </Button>
            <Button
              icon={<SisternodeOutlined />}
              onClick={handleRemoveExtraNodes}
              loading={actionLoading === "remove"}
              disabled={
                extraAttributeNodes.length === 0 || actionLoading != null
              }
            >
              Remove Extra Nodes
            </Button>
          </Space>
          {actionLoading && actionProgress.total > 0 ? (
            <Text type="secondary">
              {actionProgress.mode === "add"
                ? "Adding nodes"
                : "Removing nodes"}
              : {actionProgress.completed}/{actionProgress.total}
            </Text>
          ) : null}
        </>
      )}
    </div>
  );
};

const Info = () => {
  const filename = useSelector((state) => state.metadata.filename);
  const dt = useSelector((state) => state.metadata.attributes);
  const numericNodes = useSelector((state) => selectNumericNodes(state));
  const textNodes = useSelector((state) => selectTextNodes(state));
  const determineNodes = useSelector((state) => selectDetermineNodes(state));
  const aggregationNodes = useSelector((state) =>
    selectAggregationNodes(state),
  );
  const visibleMeasurements = useSelector(selectNavioVars);

  return (
    <div className={styles.tabColumn}>
      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Metadata
      </Title>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          File Name:
        </Text>{" "}
        <Text type="secondary">{filename ? filename : "—"}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Nº Nodes:
        </Text>{" "}
        <Text type="secondary">
          {dt?.length - aggregationNodes?.length || 0} original,{" "}
          {aggregationNodes?.length || 0} new
        </Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Numeric Attributes:
        </Text>{" "}
        <Text type="secondary">{numericNodes?.length || 0}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Categorical Attributes:
        </Text>{" "}
        <Text type="secondary">{textNodes?.length || 0}</Text>
      </div>

      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Unknown Attributes:
        </Text>{" "}
        <Text type="secondary">{determineNodes?.length || 0}</Text>
      </div>
      <div>
        <Text strong style={{ color: "var(--primary-color)" }}>
          Visible measurements:
        </Text>{" "}
        <Text type="secondary">
          {formatListPreview(visibleMeasurements, 12, "—")}
        </Text>
      </div>

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Hierarchy/Data Sync
      </Title>
      <SyncPanel />
    </div>
  );
};

const UploadPanel = () => {
  return (
    <div className={`${styles.tabColumn} ${styles.tabColumnWithDivider}`}>
      <Title
        level={4}
        style={{ marginBottom: 0, color: "var(--primary-color)" }}
      >
        Upload Hierarchy
      </Title>
      <Text type="secondary">
        This replaces the current hierarchy and updates the visible
        measurements.
      </Text>
      <DragDropHierarchy />

      <Divider style={{ margin: "1rem 0" }} />

      <Title level={4} style={{ marginTop: 0, color: "var(--primary-color)" }}>
        Expected File
      </Title>
      <div>
        <Text type="secondary">
          Upload a JSON array of hierarchy measurements. Each measurement should
          include the fields `id`, `name`, `type`, `dtype`, `related`, and
          `isShown`.
        </Text>
      </div>
      <div>
        <Text type="secondary">
          `related` is a list of child measurement IDs. The root measurement
          must have `id: 0` and `type: &quot;root&quot;`.
        </Text>
      </div>
      <div>
        <Text type="secondary">
          Aggregation measurements may include `info.exec` (formula) and should
          match existing data measurements by `name`.
        </Text>
      </div>
    </div>
  );
};

export default function TabHierarchy() {
  return (
    <div className={styles.tabPaneBody}>
      <div className={styles.tabSplit}>
        <Info />
        <UploadPanel />
      </div>
    </div>
  );
}
