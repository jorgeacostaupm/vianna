import { useState, useRef, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pubsub } from "@/utils/pubsub";
import { Formik, Form } from "formik";

import { updateAttribute } from "@/store/features/metadata";

import { NodeBar } from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";

import { validateNodeValues } from "./NodeValidation";
import NodeAggregationConfig from "./NodeAggregationConfig";
import { VARIABLE_VALUES_LIMIT } from "./nodeMenuConstants";
import {
  getVariableSampleValues,
  resolveExistingColumnName,
} from "./nodeMenuUtils";
import { buildAggregationMenuNodes } from "./aggregationMenuNodes";
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

    const meanWeights =
      node.aggregationConfig?.operation === "mean"
        ? extractMeanWeightsFromFormula(node.aggregationConfig?.formula)
        : new Map();
    const relatedNodes = (Array.isArray(node.related) ? node.related : [])
      .map((id) => attributes.find((attribute) => attribute.id === id))
      .filter(Boolean);

    return buildAggregationMenuNodes({
      attributes,
      node,
      relatedNodes,
      meanWeights,
    });
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

            const isAggregationNode = values.type === "aggregation";
            const childCount = Array.isArray(node.related)
              ? node.related.length
              : 0;
            const aggregationScope =
              childCount > 0 ? "children" : "all attributes";

            return (
              <Form className={styles.nodeInfoBody} ref={resizeRef}>
                <section className={styles.nodeInfoSection}>
                  <NodeHeaderFields
                    nChildren={childCount}
                    nodeType={node.type == null ? "root" : node.type}
                  />

                  {node?.type === "attribute" ? (
                    <NodeVariablePreview
                      values={previewValues}
                      columnName={previewColumn}
                    />
                  ) : null}

                  <NodeDescriptionField />
                </section>

                {isAggregationNode ? (
                  <section className={styles.nodeInfoSection}>
                    <NodeAggregationConfig
                      aggOp={values.aggregationConfig.operation || "sum"}
                      nodes={availableNodes}
                      vals={values}
                      scope={aggregationScope}
                    />
                  </section>
                ) : null}

                <section
                  className={`${styles.nodeInfoSection} ${styles.nodeInfoActions}`}
                >
                  <SaveButton />
                </section>
              </Form>
            );
          }}
        </Formik>
      </div>
    )
  );
};

export default NodeMenu;
