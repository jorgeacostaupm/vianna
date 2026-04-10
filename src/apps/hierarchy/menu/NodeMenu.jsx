import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { pubsub } from "@/utils/pubsub";
import { Formik, Form } from "formik";

import { updateAttribute } from "@/store/features/metadata";

import { NodeBar } from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";

import { NodeSchema } from "./NodeValidation";
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

const { subscribe, unsubscribe } = pubsub;

const NodeMenu = () => {
  const [node, setNode] = useState(null);
  const [nodeId, setNodeId] = useState(null);
  const [openMenu, toggleMenu] = useState(false);
  const attributes = useSelector((state) => state.metadata.attributes);
  const dataframe = useSelector((state) => state.dataframe.dataframe);
  const quarantineData = useSelector((state) => state.main.quarantineData);
  const attributesRef = useRef(attributes);

  const dispatch = useDispatch();

  const formRef = useRef(null);
  const resizeRef = useRef();

  useEffect(() => {
    setNode(() => attributes.find((n) => n.id === nodeId));
    attributesRef.current = attributes;
  }, [attributes]);

  useEffect(() => {
    const handleNodeInspection = ({ nodeId }) => {
      const attrs = attributesRef.current;
      const foundNode = attrs.find((n) => n.id === nodeId);
      setNode(foundNode);
      setNodeId(nodeId);
      toggleMenu(nodeId != null);
    };

    const handleToggleInspect = () => {
      toggleMenu((prev) => !prev);
    };

    const handleUntoggle = () => {
      toggleMenu(false);
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
    pubsub.publish("nodeMenuVisibilityChanged", { isOpen: openMenu });
  }, [openMenu]);

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

  const availableNodes = node.related
    .map((i) => {
      const n = attributes.find((n) => n.id === i);
      if (n == null) return null;
      const isUsed =
        node.info && node.info.usedAttributes.some((u) => u.id === n.id);
      return { id: n.id, name: n.name, weight: 1, used: isUsed };
    })
    .filter((n) => n != null);

  const closeTab = () => toggleMenu((prev) => !prev);

  return (
    openMenu && (
      <div className={styles.nodeInfo}>
        <NodeBar title={""} remove={closeTab} />
        <Formik
          innerRef={formRef}
          initialValues={node}
          onSubmit={onSubmit}
          validationSchema={NodeSchema}
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
                    <CustomMeasure formula={values.info.formula} />
                  ) : (
                    <NodeAggregationConfig
                      aggOp={values.info.operation || "sum"}
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
