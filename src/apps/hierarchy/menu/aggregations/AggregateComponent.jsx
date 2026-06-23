import { useEffect, useMemo, useState } from "react";
import DropArea from "./DropArea";
import ChildHolder from "./ChildHolder";
import { useFormikContext } from "formik";
import { generateFormulaSimplified } from "../logic/simplifiedFormulas";

const AggregateComponent = ({ nodes, aggOp }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: "0.5rem",
      }}
    >
      <DropWrapper nodes={nodes} aggOp={aggOp} />
    </div>
  );
};

const DropWrapper = ({ nodes, aggOp }) => {
  const {
    setFieldValue,
    values: { aggregationConfig },
  } = useFormikContext();
  const form = useFormikContext();
  const [usedNodes, setUsedNodes] = useState([]);
  const [unusedNodes, setUnusedNodes] = useState([]);
  const nodesKey = useMemo(
    () =>
      nodes
        .map((node) => `${node.id}:${node.name}:${node.weight}:${node.used}`)
        .join("|"),
    [nodes],
  );

  useEffect(() => {
    const initialUsed = nodes.filter((n) => n.used === true);
    const initialUnused = nodes.filter((n) => n.used === false);

    setUsedNodes(initialUsed);
    setUnusedNodes(initialUnused);
  }, [nodesKey]);

  useEffect(() => {
    const persistedIds = usedNodes.map((node) => node.id);
    setFieldValue("aggregationConfig.usedAttributes", persistedIds);

    const formula = generateFormulaSimplified(
      aggregationConfig.operation,
      usedNodes,
    );
    setFieldValue("aggregationConfig.formula", formula.formula || "");
    setTimeout(() => {
      form.validateForm();
    }, 0);
  }, [aggregationConfig.operation, JSON.stringify(usedNodes)]);

  const removeNode = (nodeId, wasUsed) => {
    if (wasUsed) {
      setUsedNodes((prev) => prev.filter((n) => n.id !== nodeId));
    } else {
      setUnusedNodes((prev) => prev.filter((n) => n.id !== nodeId));
    }
  };

  const moveNode = (node, willBeUsed, position) => {
    if (willBeUsed) {
      setUsedNodes((prev) => {
        const updatedUsed = [...prev.filter((n) => n.id !== node.id)];
        return position === -1
          ? [...updatedUsed, node]
          : [
              ...updatedUsed.slice(0, position),
              node,
              ...updatedUsed.slice(position),
            ];
      });
      removeNode(node.id, false);
    } else {
      setUnusedNodes((prev) => {
        const updatedUnused = [...prev.filter((n) => n.id !== node.id)];
        return position === -1
          ? [...updatedUnused, node]
          : [
              ...updatedUnused.slice(0, position),
              node,
              ...updatedUnused.slice(position),
            ];
      });
      removeNode(node.id, true);
    }
  };

  const updateNodeWeight = (nodeId, weight) => {
    setUsedNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, weight } : node)),
    );
  };

  const modeAllNodes = (willBeUsed) => {
    if (willBeUsed) {
      const allUnusedAsUsed = unusedNodes.map((n) => ({ ...n, used: true }));
      setUsedNodes((prev) => [...prev, ...allUnusedAsUsed]);
      setUnusedNodes([]);
    } else {
      const allUsedAsUnused = usedNodes.map((n) => ({ ...n, used: false }));
      setUnusedNodes((prev) => [...prev, ...allUsedAsUnused]);
      setUsedNodes([]);
    }
  };

  return (
    <>
      <DropArea
        allNodes={nodes}
        aggOp={aggOp}
        nodes={usedNodes}
        moveNode={moveNode}
        updateNodeWeight={updateNodeWeight}
        modeAllNodes={modeAllNodes}
      />

      <ChildHolder
        allNodes={nodes}
        nodes={unusedNodes}
        moveNode={moveNode}
      />
    </>
  );
};

export default AggregateComponent;
