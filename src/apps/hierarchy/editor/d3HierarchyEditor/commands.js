import * as d3 from "d3";

import { setNavioColumns } from "@/store/features/dataframe";
import { aggregateSelectedNodes, changeOrder } from "@/store/features/metadata";
import {
  changeRelationship,
  changeRelationshipBatch,
  removeAttribute,
} from "@/store/features/metadata";
import store from "@/store/store";

import { pubsub } from "@/utils/pubsub";
import { getRandomInt } from "@/utils/functions";
import {
  extractErrorMessage,
  formatListPreview,
  notify,
  notifyError,
  notifyInfo,
  notifyWarning,
} from "@/components/notifications";

import { transitionDuration } from "./constants";
import {
  canNodeAcceptChildren,
  computeNavioColumnsFromHierarchy,
  getNodeLabel,
} from "./helpers";

const { publish, subscribe, unsubscribe } = pubsub;

export function scheduleNavioSync(delay = 0) {
  if (this.navioSyncTimeout) {
    clearTimeout(this.navioSyncTimeout);
  }

  this.navioSyncTimeout = setTimeout(() => {
    this.navioSyncTimeout = null;
    this.setNavioNodes();
  }, Math.max(0, delay));
}

export function onChangeOrder(node, newIndex) {
  this.svg.selectAll(".ghostCircle").attr("fill-opacity", 0);
  this.instantNextUpdate = true;

  const sourceID = node.id;
  const parentID = node.parent.id;

  this.dispatcher(
    changeOrder({
      sourceID,
      parentID,
      newIndex,
    }),
  );
  this.scheduleNavioSync(transitionDuration + 16);
}

export function setNavioNodes() {
  const attrs = store.getState().metadata.attributes;
  const columns = computeNavioColumnsFromHierarchy(attrs);

  const currentColumns = store.getState().dataframe.navioColumns || [];
  const hasSameColumns =
    columns.length === currentColumns.length &&
    columns.every((columnName, index) => columnName === currentColumns[index]);

  if (hasSameColumns) return;

  this.dispatcher(setNavioColumns(columns));
}

export function onChangeHierarchy() {
  this.svg.selectAll(".ghostCircle").attr("fill-opacity", 0);
  const draggedNode = this.nodesDragged?.[0];
  if (!draggedNode || !this.targetNode) return;

  const targetID = this.targetNode.data.id;
  const sourceID = draggedNode.id;

  const isSelfOrDescendantDrop =
    sourceID === targetID ||
    draggedNode
      .descendants?.()
      ?.some((descendant) => descendant.id === targetID);

  if (isSelfOrDescendantDrop) {
    notifyWarning({
      message: "Cannot reassign node",
      description: `${getNodeLabel(draggedNode)} cannot be moved into itself or one of its descendants.`,
    });
    this.drawHierarchy(this.root, true);
    return;
  }

  if (!canNodeAcceptChildren(this.targetNode?.data)) {
    notifyWarning({
      message: "Cannot reassign node",
      description:
        "Target measure node has a valid formula and cannot receive child nodes.",
    });
    this.drawHierarchy(this.root, true);
    return;
  }

  this.instantNextUpdate = true;
  this.dispatcher(
    changeRelationship({
      sourceID,
      targetID,
      recover: true,
    }),
  );
  this.scheduleNavioSync(transitionDuration + 16);
}

export async function addSelectedNodes({ parent }) {
  const mods = this.getSelectedNodesToModify();

  const targetNode = this.root
    ?.descendants?.()
    .find((node) => node.id === parent);

  if (!canNodeAcceptChildren(targetNode?.data)) {
    notifyWarning({
      message: "Cannot add selected nodes",
      description:
        "Target measure node has a valid formula and cannot receive child nodes.",
    });
    return;
  }

  const targetAncestorIds = new Set(
    targetNode?.ancestors?.().map((ancestor) => ancestor.id) || [],
  );

  const toMove = [];
  const failed = [];

  mods.forEach((d) => {
    const nodeName = getNodeLabel(d);
    if (d.id === parent || targetAncestorIds.has(d.id)) {
      failed.push(
        `${nodeName}: cannot move into itself or one of its descendants.`,
      );
      return;
    }
    toMove.push(d);
  });

  if (toMove.length > 0) {
    try {
      const result = await this.dispatcher(
        changeRelationshipBatch({
          sourceIDs: toMove.map((d) => d.id),
          targetID: parent,
          recover: false,
          silent: true,
        }),
      ).unwrap();

      if (Array.isArray(result?.failed) && result.failed.length > 0) {
        const nodeLabelById = new Map(toMove.map((d) => [d.id, getNodeLabel(d)]));
        result.failed.forEach(({ sourceID, reason }) => {
          const nodeName = nodeLabelById.get(sourceID) || `Node #${sourceID}`;
          failed.push(`${nodeName}: ${reason || "Unknown error"}`);
        });
      }
    } catch (error) {
      failed.push(extractErrorMessage(error, "Unknown error"));
    }
  }

  if (failed.length > 0) {
    notify({
      message:
        failed.length === mods.length
          ? "Cannot add selected nodes"
          : "Selection moved with warnings",
      description: `Failed (${failed.length}): ${formatListPreview(failed, 4)}`,
      type: failed.length === mods.length ? "error" : "warning",
      pauseOnHover: true,
      duration: 6,
    });
  }

  if (toMove.length > 0 || failed.length > 0) {
    this.clearSelection();
  }

  if (toMove.length > 0) {
    this.scheduleNavioSync(transitionDuration + 16);
  }
}

export async function removeSelectedNodes() {
  const selectedNodes = this.getSelectedNodes();

  if (selectedNodes.length === 0) {
    notifyInfo({
      message: "No nodes selected",
      description: "Select one or more nodes to delete them.",
    });
    return;
  }

  const deletableNodes = selectedNodes.filter(
    (node) => node.id !== 0 && node.id !== this.root?.id,
  );

  if (deletableNodes.length === 0) {
    notifyWarning({
      message: "Cannot delete selection",
      description: "The root node cannot be deleted.",
    });
    return;
  }

  const nodeNames = deletableNodes.map((node) => getNodeLabel(node));
  const shouldDelete = window.confirm(
    `You are going to delete ${deletableNodes.length} selected node${
      deletableNodes.length === 1 ? "" : "s"
    }.\n\n${formatListPreview(nodeNames, 4)}\n\nThis action cannot be undone.`,
  );

  if (!shouldDelete) return;

  const failed = [];
  let deletedCount = 0;

  const sortedNodes = deletableNodes
    .slice()
    .sort(
      (a, b) =>
        (b.ancestors?.()?.length ?? 0) - (a.ancestors?.()?.length ?? 0),
    );

  const getDeletePrecheckError = (nodeId) => {
    const attributes = store.getState().metadata.attributes;
    if (!Array.isArray(attributes)) {
      return "Metadata attributes are not available.";
    }

    const currentNode = attributes.find((n) => n.id === nodeId);
    if (!currentNode) return "Node no longer exists.";

    const parentNode = attributes.find((n) => n.related.includes(nodeId));
    if (!parentNode) return "Current parent not found in hierarchy.";

    const isUsed = parentNode.info?.usedAttributes?.find(
      (used) => used.id === nodeId,
    );
    if (isUsed) return "Node is part of an existing aggregation.";

    return null;
  };

  for (const node of sortedNodes) {
    const precheckError = getDeletePrecheckError(node.id);
    if (precheckError) {
      failed.push(`${getNodeLabel(node)}: ${precheckError}`);
      continue;
    }

    try {
      await this.dispatcher(
        removeAttribute({ attributeID: node.id }),
      ).unwrap();
      deletedCount += 1;
    } catch (error) {
      failed.push(
        `${getNodeLabel(node)}: ${extractErrorMessage(error, "Unknown error")}`,
      );
    }
  }

  this.clearSelection();

  if (failed.length === 0) {
    notify({
      message: "Selection deleted",
      description: `Deleted (${deletedCount}): ${formatListPreview(nodeNames, 6)}`,
      type: "success",
    });
    return;
  }

  notify({
    message:
      deletedCount === 0
        ? "Cannot delete selected nodes"
        : "Selection deleted with warnings",
    description:
      deletedCount === 0
        ? `Failed (${failed.length}): ${formatListPreview(failed, 4)}`
        : `Deleted ${deletedCount}/${deletableNodes.length}. Failed (${failed.length}): ${formatListPreview(failed, 4)}`,
    type: deletedCount === 0 ? "error" : "warning",
    pauseOnHover: true,
    duration: 6,
  });
}

export function onResize(newDim) {
  if (newDim === null) {
    return;
  }
  const { width, height } = newDim;
  this.svg.attr("width", width).attr("height", height);

  this.dims.width = width;
  this.dims.height = height;
}

export function aggregateSelectedNodesAction({ parent, source }) {
  const aggregationNode = {
    id: getRandomInt(0, 9999999),
    name: "Unknown Aggregation",
    type: "aggregation",
  };

  const mods = this.getSelectedNodesToModify();

  const attributes = store.getState().metadata.attributes || [];
  const childIDs = [];
  const failed = [];

  mods.forEach((d) => {
    const nodeName = getNodeLabel(d);
    if (d.id === parent || d.descendants().some((nd) => nd.id === parent)) {
      failed.push(
        `${nodeName}: cannot aggregate into itself or one of its descendants.`,
      );
      return;
    }

    const hasParent = attributes.some((n) => n.related.includes(d.id));
    if (!hasParent) {
      failed.push(`${nodeName}: current parent not found in hierarchy.`);
      return;
    }

    childIDs.push(d.id);
  });

  if (childIDs.length === 0) {
    if (failed.length > 0) {
      notifyError({
        message: "Cannot aggregate selection",
        description: `Failed (${failed.length}): ${formatListPreview(failed, 4)}`,
        pauseOnHover: true,
        duration: 6,
      });
    }
    return;
  }

  this.dispatcher(
    aggregateSelectedNodes({
      ...aggregationNode,
      childIDs,
      parentID: parent,
      sourceID: source,
    }),
  );
  this.clearSelection();

  if (failed.length > 0) {
    notifyWarning({
      message: "Aggregation completed with warnings",
      description: `Failed (${failed.length}): ${formatListPreview(failed, 4)}`,
      pauseOnHover: true,
      duration: 6,
    });
  }
}

export function inspectNode({ nodeId }) {
  const node = this.root.descendants().find((d) => d.id === nodeId);
  if (!node) return;

  publish("nodeInspectionNode", { nodeId });
}

export function focusNode({ nodeId }) {
  const node = this.root.descendants().find((d) => d.id === nodeId);
  if (!node) return;

  const { width, height } = this.dims;
  const scale = 0.8;

  const { x: screenX, y: screenY } = this.projectPoint(node.x, node.y);
  const tx = width / 2 - screenX * scale;
  const ty = height / 2 - screenY * scale;

  this.svg
    .transition()
    .duration(transitionDuration)
    .call(
      this.zoomBehaviour.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale),
    )
    .on("end", () => {
      const nodeG = this.svg
        .selectAll(".circleG")
        .filter((d) => d.id === nodeId);
      if (nodeG.empty()) return;

      const nodeColor =
        nodeG.select("circle").attr("fill") ||
        nodeG.select("circle").attr("stroke") ||
        "var(--color-brand)";

      const highlight = nodeG
        .append("circle")
        .attr("class", "focus-ring")
        .attr("r", 0)
        .attr("stroke", nodeColor)
        .attr("stroke-width", 10)
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .attr("opacity", 0.9);

      highlight
        .transition()
        .duration(1200)
        .attr("r", 100)
        .attr("opacity", 0)
        .ease(d3.easeCubicOut)
        .remove();
    });
}

export function onNodeMenuVisibilityChanged({ isOpen }) {
  this.isNodeMenuOpen = Boolean(isOpen);
}

export function addSubscriptions() {
  this.subscriptionHandlers = {
    addSelectedNodes: this.addSelectedNodes.bind(this),
    aggregateSelectedNodes: this.aggregateSelectedNodes.bind(this),
    removeSelectedNodes: this.removeSelectedNodes.bind(this),
    focusNode: this.focusNode.bind(this),
    inspectNode: this.inspectNode.bind(this),
    nodeMenuVisibilityChanged: this.onNodeMenuVisibilityChanged.bind(this),
  };

  Object.entries(this.subscriptionHandlers).forEach(([eventName, handler]) => {
    subscribe(eventName, handler);
  });
}

export function destroy() {
  if (this.navioSyncTimeout) {
    clearTimeout(this.navioSyncTimeout);
    this.navioSyncTimeout = null;
  }

  clearTimeout(this._tooltipTimer);
  this._tooltipTimer = null;
  this._tooltipNode = null;

  d3.select(window).on("keydown.hierarchy-editor", null);
  if (this.svg) {
    this.svg.on("click.editor", null).on("contextmenu.editor", null);
  }

  Object.entries(this.subscriptionHandlers).forEach(([eventName, handler]) => {
    unsubscribe(eventName, handler);
  });
  this.subscriptionHandlers = {};
}
