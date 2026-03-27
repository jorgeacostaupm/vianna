import * as d3 from "d3";

import { getSelectionRootsAndOrphans } from "./helpers";

export function getSelectedNodes() {
  return this.svg
    .selectAll(".circleG")
    .filter(function () {
      return d3.select(this).select(".showCircle").classed("selectedNode");
    })
    .data();
}

export function getSelectedNodesToModify() {
  return getSelectionRootsAndOrphans(this.getSelectedNodes());
}

export function isRootNodeId(nodeId) {
  return nodeId === this.root?.id || nodeId === 0;
}

export function setNodeSelection(nodeId, isSelected) {
  if (this.isRootNodeId(nodeId)) return false;

  const nodeShape = this.svg
    .selectAll(".circleG")
    .filter((d) => d.id === nodeId)
    .select(".showCircle");

  if (nodeShape.empty()) return false;

  nodeShape.classed("selectedNode", Boolean(isSelected));
  return true;
}

export function toggleNodeSelection(nodeId) {
  if (this.isRootNodeId(nodeId)) return false;

  const nodeShape = this.svg
    .selectAll(".circleG")
    .filter((d) => d.id === nodeId)
    .select(".showCircle");

  if (nodeShape.empty()) return false;

  const nextIsSelected = !nodeShape.classed("selectedNode");
  nodeShape.classed("selectedNode", nextIsSelected);
  return nextIsSelected;
}

export function clearSelection() {
  this.svg.selectAll(".showCircle").classed("selectedNode", false);
}

export function resetDragVisualState() {
  this.main.selectAll(".circleG").style("display", "block");
  this.main.selectAll(".link").style("display", "block");
  this.main.selectAll(".circleG").classed("highlight-sibling", false);
  this.main.selectAll(".circleG").classed("dragging-subtree", false);
  this.svg.style("cursor", this.isClickSelectionMode ? "pointer" : "default");
}
