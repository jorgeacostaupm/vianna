import * as d3 from "d3";

import { toggleAttribute } from "@/store/features/metadata";
import { pubsub } from "@/utils/pubsub";
import { fixTooltipToNode } from "@/utils/functions";

import {
  dragClickThreshold,
  nodeDoubleClickDelayMs,
  tooltipHoverDelayMs,
} from "./constants";
import { getSiblingReorderIndex } from "./siblingReorder";

const { publish } = pubsub;

const getNodeSubtree = (node) =>
  node?.descendants ? node.descendants() : [node];

const rememberOriginalSubtreePosition = (subtree) => {
  subtree.forEach((d) => {
    if (d._originalX === undefined) d._originalX = d.x;
    if (d._originalY === undefined) d._originalY = d.y;
  });
};

const renderSubtreePreview = (graph, subtree) => {
  graph.main
    .selectAll(".circleG")
    .filter((nodeD) => subtree.some((d) => d.id === nodeD.id))
    .attr("transform", (d) => graph.getNodeTransform(d));

  graph.main
    .select("#links")
    .selectAll("path")
    .filter(
      (l) =>
        subtree.some((n) => n.id === l.source.id) ||
        subtree.some((n) => n.id === l.target.id),
    )
    .attr("d", (l) => graph.getLinkPath(l));
};

const resetSiblingPreview = (graph, siblings, movingIds) => {
  siblings.forEach((childNode) => {
    if (movingIds.has(childNode.id)) return;

    const subtree = getNodeSubtree(childNode);
    rememberOriginalSubtreePosition(subtree);

    subtree.forEach((d) => {
      d.x = d._originalX;
      d.y = d._originalY;
    });

    renderSubtreePreview(graph, subtree);
  });
};

export function addNodeEvents(nodes) {
  const graph = this;

  nodes
    .on("mouseover", function (e, node) {
      if (graph.isClickSelectionMode) {
        graph.svg.style("cursor", "pointer");
      } else if (graph.nodesDragged.length === 0) {
        graph.svg.style("cursor", "grab");
      }

      if (!node?.data?.description || graph.onDrag) return;

      graph._tooltipNode = node;
      graph._tooltipTimer = setTimeout(() => {
        if (graph.onDrag || graph._tooltipNode !== node) return;

        graph.tooltip.html(node.data.description);

        fixTooltipToNode(d3.select(this), graph.tooltip);
      }, tooltipHoverDelayMs);
    })
    .on("mouseleave", () => {
      graph.svg.style(
        "cursor",
        graph.isClickSelectionMode ? "pointer" : "default",
      );

      clearTimeout(graph._tooltipTimer);
      graph._tooltipTimer = null;
      graph._tooltipNode = null;

      graph.tooltip.style("visibility", "hidden");
    })
    .on("contextmenu", (event, node) => {
      const rect = this.containerRef.getBoundingClientRect();
      const selection = this.svg
        .selectAll(".showCircle.selectedNode")
        .filter((d) => d.id === node.id);

      const isSelectedNode = !selection.empty();

      const hasSelectedNodes =
        this.svg
          .selectAll(".circleG")
          .filter(function () {
            return d3
              .select(this)
              .select(".showCircle")
              .classed("selectedNode");
          })
          .size() > 0;

      publish("toggleEvent", {
        node,
        position: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        isSelectedNode,
        hasSelectedNodes,
      });
      event.preventDefault();
      event.stopPropagation();
    });
}

export function getDragBehaviour() {
  const graph = this;

  return d3
    .drag()
    .on("start", function (event, node) {
      if (node.id === graph.root.id) return;

      graph._dragStartX = event.x;
      graph._dragStartY = event.y;
      graph._hasDragged = false;

      clearTimeout(graph._tooltipTimer);
      graph.tooltip.style("visibility", "hidden");
    })
    .on("drag", function (event, node) {
      if (!graph._hasDragged) {
        const dx = Math.abs(event.x - graph._dragStartX);
        const dy = Math.abs(event.y - graph._dragStartY);

        if (dx < dragClickThreshold && dy < dragClickThreshold) return;

        graph._hasDragged = true;
        graph.onDrag = true;
        const selectedNodes = graph.getSelectedNodes();

        graph.isMultiSelect =
          selectedNodes.length > 1 && selectedNodes.some((d) => d === node);

        graph.nodesDragged = graph.isMultiSelect ? selectedNodes : [node];

        graph.onInitialNodeDrag(node, graph.isMultiSelect);

        const parent = node.parent;

        if (parent && parent.children) {
          const siblings = parent.children.slice();
          const nodesToReorder = graph.isMultiSelect
            ? graph.getSelectedNodesToModify()
            : [node];
          const canReorderDraggedNodes =
            nodesToReorder.length > 0 &&
            nodesToReorder.some((d) => d.id === node.id) &&
            nodesToReorder.every((d) => d.parent?.id === parent.id);

          const xs = siblings.map((s) => s.x);
          const ys = siblings.map((s) => s.y);
          graph._dragSiblingXPositions = xs;
          graph._dragSiblingOriginalPositions = new Map(
            siblings.map((s) => [s.id, { x: s.x, y: s.y }]),
          );

          graph._dragSiblingMinX = Math.min(...xs);
          graph._dragSiblingMaxX = Math.max(...xs);
          graph._dragSiblingMinY =
            Math.min(...ys) - graph.viewConfig.depthSpacing;
          graph._dragSiblingMaxY =
            Math.max(...ys) + graph.viewConfig.depthSpacing;

          graph._canReorderDraggedNodes = canReorderDraggedNodes;
          graph._dragReorderNodes = canReorderDraggedNodes
            ? nodesToReorder
            : [];

          const movingIds = new Set(
            graph._dragReorderNodes.map((d) => d.id),
          );
          const orderedSiblings = siblings
            .slice()
            .sort((a, b) => a.x - b.x);
          const firstMovingIndex = orderedSiblings.findIndex((s) =>
            movingIds.has(s.id),
          );
          graph._dragOriginalIndex =
            firstMovingIndex === -1
              ? -1
              : orderedSiblings
                  .slice(0, firstMovingIndex)
                  .filter((s) => !movingIds.has(s.id)).length;
          graph._originalX = node.x;
          graph._currentHoverIndex = graph._dragOriginalIndex;
        }
      }

      graph.svg.style("cursor", "grabbing");

      const movingNodes = getNodeSubtree(node);

      const { x: deltaX, y: deltaY } = graph.getLogicalDelta(
        event.dx,
        event.dy,
      );

      movingNodes.forEach((d) => {
        d.x += deltaX;
        d.y += deltaY;
      });

      graph.main
        .select("#nodes")
        .selectAll(".circleG")
        .filter((d) => movingNodes.some((mn) => mn.id === d.id))
        .attr("transform", (d) => graph.getNodeTransform(d))
        .lower();

      graph.main
        .select("#links")
        .selectAll("path")
        .filter((l) => {
          return (
            movingNodes.some((n) => n.id === l.source.id) &&
            movingNodes.some((n) => n.id === l.target.id)
          );
        })
        .attr("d", (l) => graph.getLinkPath(l));

      if (graph._canReorderDraggedNodes) {
        const parent = node.parent;
        if (!parent || !parent.children) return;

        const siblings = parent.children.slice();
        const movingIds = new Set(
          (graph._dragReorderNodes || []).map((d) => d.id),
        );

        if (
          node.x < graph._dragSiblingMinX - 150 ||
          node.x > graph._dragSiblingMaxX + 150 ||
          node.y < graph._dragSiblingMinY ||
          node.y > graph._dragSiblingMaxY
        ) {
          graph.main.selectAll(".circleG").classed("highlight-sibling", false);
          resetSiblingPreview(graph, siblings, movingIds);
        } else {
          const originalX = (d) =>
            graph._dragSiblingOriginalPositions?.get(d.id)?.x ?? d.x;
          const orderedSiblings = siblings
            .slice()
            .sort((a, b) => originalX(a) - originalX(b));
          const movingSiblings = orderedSiblings.filter((sib) =>
            movingIds.has(sib.id),
          );
          const unselectedSiblings = orderedSiblings.filter(
            (sib) => !movingIds.has(sib.id),
          );

          if (unselectedSiblings.length === 0) {
            graph.main
              .selectAll(".circleG")
              .classed("highlight-sibling", false);
            return;
          }

          const sortedSiblings = unselectedSiblings.map((sib) => ({
            ...sib,
            x: originalX(sib),
          }));

          const newIndex = getSiblingReorderIndex({
            draggedX: node.x,
            originalIndex: graph._dragOriginalIndex,
            sortedSiblings,
            assignRadius: graph.getAssignRadius(),
          });

          const nextSiblings = [
            ...unselectedSiblings.slice(0, newIndex),
            ...movingSiblings,
            ...unselectedSiblings.slice(newIndex),
          ];
          const nextIndexById = new Map(
            nextSiblings.map((childNode, index) => [childNode.id, index]),
          );

          orderedSiblings.forEach((childNode) => {
            const subtree = getNodeSubtree(childNode);
            rememberOriginalSubtreePosition(subtree);

            if (movingIds.has(childNode.id)) return;

            const nextIndex = nextIndexById.get(childNode.id);
            const targetX = graph._dragSiblingXPositions[nextIndex];
            const childOriginalX =
              graph._dragSiblingOriginalPositions?.get(childNode.id)?.x ??
              childNode._originalX;
            const deltaX = targetX - childOriginalX;

            subtree.forEach((d) => {
              d.x = d._originalX + deltaX;
              d.y = d._originalY;
            });

            renderSubtreePreview(graph, subtree);
          });

          graph.newIndex = newIndex;

          const leftSibling =
            newIndex === graph._dragOriginalIndex
              ? null
              : sortedSiblings[newIndex - 1];
          const rightSibling =
            newIndex === graph._dragOriginalIndex
              ? null
              : sortedSiblings[newIndex];

          graph.main
            .selectAll(".circleG")
            .classed("highlight-sibling", false)
            .filter(
              (d) => d.id === leftSibling?.id || d.id === rightSibling?.id,
            )
            .classed("highlight-sibling", true);
        }
      }
    })
    .on("end", function (event, node) {
      if (graph.targetNode) {
        if (graph.nodesDragged.length === 1) graph.onChangeHierarchy();
        else graph.addSelectedNodes({ parent: graph.targetNode.id });
      } else if (graph._canReorderDraggedNodes && graph.onDrag) {
        const hasHighlightedSibling = !graph.main
          .selectAll(".circleG.highlight-sibling")
          .empty();

        if (hasHighlightedSibling) {
          graph.onChangeOrder(node, graph.newIndex);
        } else {
          graph.drawHierarchy(graph.root);
        }
        if (graph.isMultiSelect) {
          graph.clearSelection();
        } else {
          d3.select(this).select(".showCircle").classed("selectedNode", false);
        }
      } else if (!graph.onDrag) {
        graph.onNodeClick(node, event.sourceEvent);
      } else {
        graph.drawHierarchy(graph.root, true);
      }
      graph.svg.selectAll(".ghostCircle").attr("fill-opacity", 0);
      graph.resetDragVisualState();
      graph.targetNode = null;
      graph.nodesDragged = [];
      graph._canReorderDraggedNodes = false;
      graph._dragReorderNodes = [];
      graph._dragSiblingOriginalPositions = null;
      graph.onDrag = false;
    });
}

export function onInitialNodeDrag(node, isMultiSelect = false) {
  const nodesToMove = isMultiSelect ? this.getSelectedNodes() : [node];

  const descendants = nodesToMove.flatMap((n) =>
    n.descendants ? n.descendants() : [n],
  );

  if (isMultiSelect) {
    this.main
      .select("#nodes")
      .selectAll(".circleG")
      .filter(
        (d) =>
          descendants.some((sd) => sd.id === d.id) && d.id !== node.data.id,
      )
      .style("display", "none");

    this.main
      .select("#links")
      .selectAll("path")
      .filter((l) => {
        return (
          descendants.some((d) => d.id === l.source.id) ||
          descendants.some((d) => d.id === l.target.id)
        );
      })
      .style("display", "none");
  } else {
    this.main
      .select("#nodes")
      .selectAll(".circleG")
      .filter((d) => descendants.some((sd) => sd.id === d.id))
      .each(function () {
        this.parentNode.appendChild(this);
      });

    this.main
      .select("#links")
      .selectAll("path")
      .filter((l) => {
        return (
          descendants.some((d) => d.id === l.source.id) ||
          descendants.some((d) => d.id === l.target.id)
        );
      })
      .each(function () {
        this.parentNode.appendChild(this);
      });

    this.main
      .select("#links")
      .selectAll("path")
      .filter((l) => node.data.id === l.target.id)
      .style("display", "none");

    this.main
      .select("#nodes")
      .selectAll(".circleG")
      .filter((d) => descendants.some((sd) => sd.id === d.id))
      .classed("dragging-subtree", true);
  }
}

export function onNodeClick(node, sourceEvent) {
  if ((sourceEvent?.detail ?? 1) > 1) {
    clearTimeout(this.nodeClickTimer);
    this.nodeClickTimer = null;
    this.inspectNode({ nodeId: node.id });
    return;
  }

  clearTimeout(this.nodeClickTimer);
  this.nodeClickTimer = setTimeout(() => {
    this.nodeClickTimer = null;

    if (this.isNodeMenuOpen && node?.id != null) {
      publish("nodeInspectionNode", { nodeId: node.id });
      return;
    }

    if (this.isRootNodeId(node?.id)) {
      publish("untoggleEvent", {});
      return;
    }

    if (this.isClickSelectionMode) {
      this.toggleNodeSelection(node.id);
      return;
    }

    if (node.children === undefined || node._children === undefined) {
      return;
    }

    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else {
      node.children = node._children;
      node._children = null;
    }

    this.dispatcher(
      toggleAttribute({ attributeID: node.data.id, fromFocus: false }),
    );

    this.drawHierarchy(node);
    this.scheduleNavioSync(this.getTransitionDuration());
  }, nodeDoubleClickDelayMs);
}

export function getBrush() {
  const vis = this;
  const brush = d3
    .brush()
    .on("start", brushStart)
    .on("brush", brushMove)
    .on("end", brushEnd);

  function brushStart(e) {
    e.sourceEvent.stopPropagation();
  }

  function brushMove() {}

  function brushEnd({ selection }) {
    if (!selection) {
      removeBrush();
      rearmBrushIfNeeded();
      return;
    }

    const [[x0, y0], [x1, y1]] = selection;
    const svgNode = vis.svg.node();
    const pt = svgNode.createSVGPoint();

    const nodesInside = [];
    vis.svg.selectAll(".circleG").each(function (d) {
      pt.x = 0;
      pt.y = 0;
      const { x: gx, y: gy } = pt.matrixTransform(this.getCTM());
      if (gx >= x0 && gx <= x1 && gy >= y0 && gy <= y1) {
        nodesInside.push(d);
      }
    });

    if (nodesInside.length === 0) {
      removeBrush();
      rearmBrushIfNeeded();
      return;
    }

    nodesInside.forEach((node) => {
      vis.toggleNodeSelection(node.id);
    });

    removeBrush();
    rearmBrushIfNeeded();
  }

  function removeBrush() {
    vis.svg.selectAll(".brush").remove();
    vis.svg.on(".brush", null);
    vis.svg.call(vis.zoomBehaviour);
    vis.disableZoomDoubleClick?.();
  }

  function rearmBrushIfNeeded() {
    if (vis.selectionMode !== "brush") return;
    setTimeout(() => {
      if (vis.selectionMode !== "brush") return;
      vis.activateBrushSelection();
    }, 0);
  }

  return brush;
}
