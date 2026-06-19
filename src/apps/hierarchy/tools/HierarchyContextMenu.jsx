import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as d3 from "d3";
import { Empty, Input, Modal } from "antd";

import {
  EyeOutlined,
  SendOutlined,
  SearchOutlined,
  SubnodeOutlined,
  DeleteOutlined,
  PlusOutlined,
  NodeCollapseOutlined,
  ExperimentFilled,
  ExperimentOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";

import { pubsub } from "@/utils/pubsub";
import styles from "@/styles/Charts.module.css";
import { addAttribute, removeAttribute } from "@/store/features/metadata";
import {
  setNodeOverviewAccess,
  setNodesOverviewAccess,
} from "@/store/features/metadata";
import { getRandomInt } from "@/utils/functions";
import OperationModal from "./OperationModal";
import { AppButton, APP_BUTTON_VARIANTS } from "@/components/buttons/core";
import { createUniqueNodeName } from "@/apps/hierarchy/nodeNames";
import { notifyError } from "@/components/notifications";
import { getSendToDestinations } from "./sendToDestinations";

const { subscribe, unsubscribe, publish } = pubsub;

export default function HierarchyContextMenu({ editor }) {
  const dispatch = useDispatch();
  const attributes = useSelector((state) => state.metadata.attributes || []);

  const [active, setActive] = useState(false);
  const [node, setNode] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isSelection, setIsSelection] = useState(false);
  const [hasSelectedNodes, setHasSelectedNodes] = useState(false);
  const [operationModalOpen, setOperationModalOpen] = useState(false);
  const [sendToOpen, setSendToOpen] = useState(false);
  const [sendToSearch, setSendToSearch] = useState("");
  const [sendToNodes, setSendToNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);

  const getSelectedNodes = useCallback(() => {
    return (
      editor?.svg
        .selectAll(".circleG")
        .filter(function () {
          return d3.select(this).select(".showCircle").classed("selectedNode");
        })
        .data() || []
    );
  }, [editor]);

  const handleToggle = useCallback((data) => {
    if (!data?.node || !data?.position) return;

    setNode(data.node);
    setPosition({ x: data.position.x, y: data.position.y });
    setIsSelection(Boolean(data.isSelectedNode));
    setHasSelectedNodes(Boolean(data.hasSelectedNodes));
    setActive(true);
  }, []);

  const handleUntoggle = useCallback(() => {
    setNode(null);
    setActive(false);
  }, []);

  useEffect(() => {
    subscribe("toggleEvent", handleToggle);
    subscribe("untoggleEvent", handleUntoggle);

    return () => {
      unsubscribe("toggleEvent", handleToggle);
      unsubscribe("untoggleEvent", handleUntoggle);
    };
  }, [handleToggle, handleUntoggle]);

  const inspectNode = () => {
    if (!node) return;
    const nodeId = node?.data?.id ?? node?.id;
    if (nodeId == null) return;
    publish("inspectNode", { nodeId });
    setActive(false);
  };

  const addNode = async () => {
    if (!node) return;
    const parentID = node?.data?.id ?? node?.id;
    if (parentID == null) return;

    const newNode = {
      id: getRandomInt(),
      name: createUniqueNodeName(
        attributes,
        "",
        (editor?.nNodes ?? attributes.length) + 1,
      ),
      type: "aggregation",
    };

    try {
      await dispatch(addAttribute({ parentID, ...newNode })).unwrap();
      publish("nodeInspectionNode", { nodeId: newNode.id, required: true });
    } catch (error) {
      notifyError({
        message: "Could not add child node",
        error,
      });
    } finally {
      setActive(false);
    }
  };

  const removeNodeById = () => {
    if (!node) return;

    const removedNode = editor.root
      .descendants()
      .find((n) => n.data.id === node.id);

    if (
      removedNode?.data?.type === "attribute" &&
      !window.confirm(
        `You are going to delete node "${removedNode.data.name}".\n\nThis action cannot be undone.`,
      )
    ) {
      publish("untoggleEvent");
      return;
    }

    dispatch(removeAttribute({ attributeID: node.id }));
    publish("untoggleEvent");
  };

  const toggleNodeOverviewAccess = () => {
    if (!node) return;

    const isRootNode = node?.data?.type === "root" || node?.id === 0;
    if (isRootNode) return;

    const currentIsActive = node?.data?.isActive !== false;
    const nextIsActive = !currentIsActive;

    dispatch(
      setNodeOverviewAccess({ nodeId: node.id, isActive: nextIsActive }),
    );
    if (node?.data) {
      node.data.isActive = nextIsActive;
      editor?.drawHierarchy?.(editor.root, true);
      editor?.scheduleNavioSync?.(0);
    }
    setActive(false);
  };

  const toggleSelectionOverviewAccess = () => {
    const nodes = getSelectedNodes();
    if (nodes.length === 0) return;

    const selectableNodes = nodes.filter((n) => {
      const nodeType = n?.data?.type || n?.type;
      return nodeType !== "root" && n?.id !== 0;
    });

    if (selectableNodes.length === 0) return;

    const allInactive = selectableNodes.every(
      (n) => n?.data?.isActive === false,
    );
    const nextIsActive = allInactive;
    const nodeIds = selectableNodes.map((n) => n.id);

    dispatch(setNodesOverviewAccess({ nodeIds, isActive: nextIsActive }));
    selectableNodes.forEach((selectedNode) => {
      if (selectedNode?.data) {
        selectedNode.data.isActive = nextIsActive;
      }
    });
    editor?.drawHierarchy?.(editor.root, true);
    editor?.scheduleNavioSync?.(0);
    setActive(false);
  };

  const aggregateSelectedNodes = () => {
    if (!node?.parent) return;

    publish("aggregateSelectedNodes", {
      parent: node.parent.id,
      source: node.id,
    });

    setActive(false);
  };

  const addSelectedNodes = () => {
    if (!node) return;

    publish("addSelectedNodes", { parent: node.id });
    setActive(false);
  };

  const openSendTo = () => {
    if (!node) return;

    const selectedNodesForSend = getSelectedNodes();
    const isRootTarget =
      (node?.data?.type || node?.type) === "root" || node?.id === 0;
    const nodesToMove =
      isSelection && selectedNodesForSend.length > 0 && !isRootTarget
        ? selectedNodesForSend
        : [node];

    setSendToNodes(nodesToMove);
    setSendToSearch("");
    setSendToOpen(true);
    setActive(false);
  };

  const closeSendTo = () => {
    setSendToOpen(false);
    setSendToSearch("");
    setSendToNodes([]);
  };

  const sendToDestination = (destinationId) => {
    const nodeIds = sendToNodes
      .map((selectedNode) => selectedNode?.id)
      .filter((nodeId) => nodeId != null);

    if (nodeIds.length === 0) return;

    publish("addSelectedNodes", {
      parent: destinationId,
      nodeIds,
    });
    closeSendTo();
  };

  const removeSelectedNodes = () => {
    publish("removeSelectedNodes");
    setActive(false);
  };

  const openModal = () => {
    if (!node?.parent) return;

    const nodes = getSelectedNodes();
    if (nodes.length === 0) return;
    setSelectedNodes(nodes);
    setOperationModalOpen(true);
  };

  const openModalSpecial = () => {
    if (!node?.parent) return;

    setSelectedNodes([node]);
    setOperationModalOpen(true);
  };

  const nodeName = node?.data?.name || node?.name || "Node";
  const nodeType = node?.data?.type || "node";
  const isNodeActive = node?.data?.isActive !== false;
  const isRootNode = nodeType === "root" || node?.id === 0;
  const selectedNodesInMenu = hasSelectedNodes ? getSelectedNodes() : [];
  const selectionCount = selectedNodesInMenu.length;
  const hasActiveSelection = selectionCount > 0;
  const showSelectionMenu = isSelection && hasActiveSelection && !isRootNode;
  const selectionToggleableNodes = selectedNodesInMenu.filter((n) => {
    const selectedType = n?.data?.type || n?.type;
    return selectedType !== "root" && n?.id !== 0;
  });
  const hasToggleableSelection = selectionToggleableNodes.length > 0;
  const isSelectionFullyInactive =
    hasToggleableSelection &&
    selectionToggleableNodes.every((n) => n?.data?.isActive === false);
  const sendToTitle =
    sendToNodes.length > 1
      ? `Send ${sendToNodes.length} nodes to...`
      : `Send ${sendToNodes[0]?.data?.name || sendToNodes[0]?.name || "node"} to...`;
  const sendToDestinations = useMemo(
    () =>
      getSendToDestinations({
        root: editor?.root,
        movingNodes: sendToNodes,
        query: sendToSearch,
      }).slice(0, 80),
    [editor, sendToNodes, sendToSearch],
  );

  const MenuAction = ({ label, icon, onClick, danger, disabled }) => (
    <AppButton
      variant={APP_BUTTON_VARIANTS.ACTION}
      size="small"
      icon={icon}
      danger={danger}
      disabled={disabled}
      className={styles.hierarchyMenuAction}
      onClick={onClick}
    >
      {label}
    </AppButton>
  );

  return (
    <>
      {active && node && (
        <div
          className={styles.hierarchyMenu}
          style={{
            left: position.x + 20,
            top: position.y - 10,
          }}
        >
          <div className={styles.hierarchyMenuHeader}>
            <span className={styles.hierarchyMenuTitle}>{nodeName}</span>
            <span className={styles.hierarchyMenuMeta}>· {nodeType}</span>
            <span className={styles.hierarchyMenuMeta}>
              · {selectionCount} selected
            </span>
          </div>

          {!showSelectionMenu && (
            <div className={styles.hierarchyMenuSection}>
              <div className={styles.hierarchyMenuSectionTitle}>Node</div>
              <div className={styles.hierarchyMenuActions}>
                {isRootNode ? (
                  <>
                    <MenuAction
                      label="Add Child"
                      icon={<SubnodeOutlined />}
                      onClick={addNode}
                    />
                    <MenuAction
                      label="Add Selection"
                      icon={<PlusOutlined />}
                      onClick={addSelectedNodes}
                      disabled={!hasActiveSelection}
                    />
                    <MenuAction
                      label="Send to"
                      icon={<SendOutlined />}
                      onClick={openSendTo}
                      disabled={isRootNode}
                    />
                  </>
                ) : (
                  <>
                    <MenuAction
                      label="Inspect"
                      icon={<EyeOutlined />}
                      onClick={inspectNode}
                    />
                    <MenuAction
                      label="Operate"
                      icon={<ExperimentOutlined />}
                      onClick={openModalSpecial}
                    />
                    {!showSelectionMenu && (
                      <MenuAction
                        label="Add Child"
                        icon={<SubnodeOutlined />}
                        onClick={addNode}
                      />
                    )}
                    <MenuAction
                      label="Add Selection"
                      icon={<PlusOutlined />}
                      onClick={addSelectedNodes}
                      disabled={!hasActiveSelection}
                    />
                    <MenuAction
                      label="Send to"
                      icon={<SendOutlined />}
                      onClick={openSendTo}
                    />
                    <MenuAction
                      label={isNodeActive ? "Hide" : "Show"}
                      icon={
                        isNodeActive ? (
                          <MinusCircleOutlined />
                        ) : (
                          <CheckCircleOutlined />
                        )
                      }
                      onClick={toggleNodeOverviewAccess}
                      disabled={isRootNode}
                    />
                    <MenuAction
                      label="Delete"
                      icon={<DeleteOutlined />}
                      onClick={removeNodeById}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {showSelectionMenu && (
            <div className={styles.hierarchyMenuSection}>
              <div className={styles.hierarchyMenuSectionTitle}>Selection</div>
              <div className={styles.hierarchyMenuActions}>
                <MenuAction
                  label="Aggregate"
                  icon={<NodeCollapseOutlined />}
                  onClick={aggregateSelectedNodes}
                />
                <MenuAction
                  label="Operate"
                  icon={<ExperimentFilled />}
                  onClick={openModal}
                />
                <MenuAction
                  label="Send to"
                  icon={<SendOutlined />}
                  onClick={openSendTo}
                />

                <MenuAction
                  label={isSelectionFullyInactive ? "Show" : "Hide"}
                  icon={
                    isSelectionFullyInactive ? (
                      <CheckCircleOutlined />
                    ) : (
                      <MinusCircleOutlined />
                    )
                  }
                  onClick={toggleSelectionOverviewAccess}
                  disabled={!hasToggleableSelection}
                />
                <MenuAction
                  label="Delete"
                  icon={<DeleteOutlined />}
                  onClick={removeSelectedNodes}
                />
              </div>
            </div>
          )}
        </div>
      )}
      {node && (
        <OperationModal
          node={node}
          selectedNodes={selectedNodes}
          open={operationModalOpen}
          setOpen={setOperationModalOpen}
          setActive={setActive}
        />
      )}
      <Modal
        title={sendToTitle}
        open={sendToOpen}
        footer={null}
        onCancel={closeSendTo}
        width={520}
      >
        <div className={styles.hierarchySendTo}>
          <Input
            autoFocus
            allowClear
            prefix={
              <SearchOutlined style={{ color: "var(--color-ink-tertiary)" }} />
            }
            placeholder="Search destination node..."
            value={sendToSearch}
            onChange={(event) => setSendToSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && sendToDestinations[0]) {
                sendToDestination(sendToDestinations[0].id);
              }
            }}
          />
          <div className={styles.hierarchySendToResults}>
            {sendToDestinations.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No valid destination"
              />
            ) : (
              sendToDestinations.map((destination) => (
                <button
                  key={destination.id}
                  type="button"
                  className={styles.hierarchySendToOption}
                  onClick={() => sendToDestination(destination.id)}
                >
                  <span className={styles.hierarchySendToName}>
                    {destination.name}
                  </span>
                  <span className={styles.hierarchySendToPath}>
                    {destination.path}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
