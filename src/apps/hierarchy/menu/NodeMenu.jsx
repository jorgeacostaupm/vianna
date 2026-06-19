import { useState, useRef, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pubsub } from "@/utils/pubsub";
import { Formik, Form } from "formik";

import { updateAttribute } from "@/store/features/metadata";

import { NodeBar } from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";

import { validateNodeValues } from "./NodeValidation";
import NodeAggregationConfig from "./NodeAggregationConfig";
import CustomMeasure from "./aggregations/CustomMeasure";
import { VARIABLE_VALUES_LIMIT } from "./nodeMenuConstants";
import {
  getVariableSampleValues,
  resolveExistingColumnName,
} from "./nodeMenuUtils";
import NodeDescriptionField from "./components/NodeDescriptionField";
import NodeHeaderFields from "./components/NodeHeaderFields";
import NodeVariablePreview from "./components/NodeVariablePreview";
import SaveButton from "./components/SaveButton";
import { extractMeanWeightsFromFormula } from "@/store/features/metadata/utils/thunkUtils";

const { subscribe, unsubscribe } = pubsub;

const NodeMenu = () => {
  const [nodeId, setNodeId] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [allowPendingNode, setAllowPendingNode] = useState(false);
  const attributes = useSelector((state) => state.metadata.attributes || []);
  const dataframe = useSelector((state) => state.dataframe.dataframe);
  const quarantineData = useSelector((state) => state.main.quarantineData);

  const dispatch = useDispatch();

  const formRef = useRef(null);
  const resizeRef = useRef();

  const node = useMemo(() => {
    if (nodeId == null) return null;
    return attributes.find((n) => n.id === nodeId) || null;
  }, [attributes, nodeId]);

  const availableNodes = useMemo(() => {
    if (!node) return [];

    const usedAttributeIds = new Set(
      Array.isArray(node.aggregationConfig?.usedAttributes)
        ? node.aggregationConfig.usedAttributes
        : [],
    );
    const meanWeights =
      node.aggregationConfig?.operation === "mean"
        ? extractMeanWeightsFromFormula(node.aggregationConfig?.formula)
        : new Map();

    return (Array.isArray(node.related) ? node.related : [])
      .map((i) => {
        const n = attributes.find((n) => n.id === i);
        if (n == null) return null;
        return {
          id: n.id,
          name: n.name,
          weight: meanWeights.get(n.name) ?? 1,
          used: usedAttributeIds.has(n.id),
        };
      })
      .filter((n) => n != null);
  }, [attributes, node]);

  useEffect(() => {
    const handleNodeInspection = ({ nodeId, required = false }) => {
      if (nodeId == null) {
        setNodeId(null);
        setAllowPendingNode(false);
        setOpenMenu(false);
        return;
      }

      setNodeId(nodeId);
      setAllowPendingNode(Boolean(required));
      setOpenMenu(true);
    };

    const handleToggleInspect = () => {
      setOpenMenu((prev) => !prev);
    };

    const handleUntoggle = () => {
      setOpenMenu(false);
      setAllowPendingNode(false);
    };

    subscribe("nodeInspectionNode", handleNodeInspection);
    subscribe("toggleInspectMenu", handleToggleInspect);
    subscribe("untoggleEvent", handleUntoggle);

    return () => {
      unsubscribe("nodeInspectionNode", handleNodeInspection);
      unsubscribe("toggleInspectMenu", handleToggleInspect);
      unsubscribe("untoggleEvent", handleUntoggle);
    };
  }, []);

  useEffect(() => {
    if (!openMenu || nodeId == null) return;

    if (node) {
      if (allowPendingNode) setAllowPendingNode(false);
      return;
    }

    if (!allowPendingNode) {
      setNodeId(null);
      setOpenMenu(false);
    }
  }, [allowPendingNode, node, nodeId, openMenu]);

  useEffect(() => {
    pubsub.publish("nodeMenuVisibilityChanged", {
      isOpen: openMenu && Boolean(node),
    });
  }, [node, openMenu]);

  useEffect(() => {
    const handleUnload = () => {
      formRef.current?.handleSubmit();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  if (node == null) return null;

  const onSubmit = async (values, { setSubmitting }) => {
    try {
      await dispatch(updateAttribute({ ...values, recover: true })).unwrap();
    } finally {
      setSubmitting(false);
    }
  };

  const closeTab = () => {
    setOpenMenu(false);
    setAllowPendingNode(false);
  };

  return (
    openMenu && (
      <div className={styles.nodeInfo}>
        <NodeBar title={""} remove={closeTab} />
        <Formik
          innerRef={formRef}
          initialValues={node}
          onSubmit={onSubmit}
          validate={(values) => validateNodeValues(values, attributes)}
          validateOnMount={true}
          enableReinitialize={true}
        >
          {({ values }) => {
            const previewColumn = resolveExistingColumnName(
              [values?.name, node?.name],
              [dataframe, quarantineData],
            );
            const previewValues = previewColumn
              ? getVariableSampleValues(
                  dataframe,
                  previewColumn,
                  VARIABLE_VALUES_LIMIT,
                )
              : [];

            return (
              <Form className={styles.nodeInfoBody} ref={resizeRef}>
                <NodeHeaderFields
                  nChildren={availableNodes.length}
                  nodeType={node.type == null ? "root" : node.type}
                />

                {node?.type === "attribute" ? (
                  <NodeVariablePreview
                    values={previewValues}
                    columnName={previewColumn}
                  />
                ) : null}

                <NodeDescriptionField />

                {values.type === "aggregation" ? (
                  availableNodes.length === 0 ? (
                    <CustomMeasure formula={values.aggregationConfig.formula} />
                  ) : (
                    <NodeAggregationConfig
                      aggOp={values.aggregationConfig.operation || "sum"}
                      nodes={availableNodes}
                      vals={values}
                      save={<SaveButton />}
                    />
                  )
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <SaveButton />
                  </div>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>
    )
  );
};

export default NodeMenu;
