import * as d3 from "d3";

import { toggleAttribute } from "@/store/async/metaAsyncReducers";
import { pubsub } from "@/utils/pubsub";
import { fixTooltipToNode } from "@/utils/functions";

import { dragClickThreshold, transitionDuration } from "./constants";
import { rangeUnordered } from "./helpers";

const { publish } = pubsub;

export function addNodeEvents(nodes) {
  const graph = this;

  nodes
    .on("mouseover", function (e, node) {
      if (graph.nodesDragged.length === 0) {
        graph.svg.style("cursor", "grab");
      }

      if (!node?.data?.desc || graph.onDrag) return;

      graph._tooltipNode = node;
      graph._tooltipTimer = setTimeout(() => {
        if (graph.onDrag || graph._tooltipNode !== node) return;

        graph.tooltip.html(node.data.desc);

        fixTooltipToNode(
          d3.select(this),
          graph.tooltip,
        );
      }, 700);
    })
    .on("mouseleave", () => {
      graph.svg.style("cursor", "default");

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

          const xs = siblings.map((s) => s.x);
          const ys = siblings.map((s) => s.y);
          graph._dragSiblingXPositions = xs;

          graph._dragSiblingMinX = Math.min(...xs);
          graph._dragSiblingMaxX = Math.max(...xs);
          graph._dragSiblingMinY = Math.min(...ys) - graph.viewConfig.depthSpacing;
          graph._dragSiblingMaxY = Math.max(...ys) + graph.viewConfig.depthSpacing;

          graph._dragOriginalIndex = graph._dragSiblingXPositions.indexOf(
            node.x,
          );
          graph._originalX = node.x;
          graph._currentHoverIndex = graph._dragOriginalIndex;
        }
      }

      graph.svg.style("cursor", "grabbing");

      const movingNodes = [node].flatMap((n) =>
        n.descendants ? n.descendants() : [n],
      );

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

      if (graph.nodesDragged.length === 1) {
        if (
          node.x < graph._dragSiblingMinX - 150 ||
          node.x > graph._dragSiblingMaxX + 150 ||
          node.y < graph._dragSiblingMinY ||
          node.y > graph._dragSiblingMaxY
        ) {
          graph.main
            .selectAll(".circleG")
            .classed("highlight-sibling", false);
        } else {
          const parent = node.parent;
          if (!parent || !parent.children) return;

          const siblings = parent.children.filter(
            (sib) => sib.id !== node.id,
          );

          if (siblings.length === 0) return;

          const sortedSiblings = siblings.slice().sort((a, b) => a.x - b.x);

          let leftSibling = null;
          let rightSibling = null;
          let newIndex = graph._dragOriginalIndex;

          for (let i = 0; i < sortedSiblings.length; i++) {
            if (node.x < sortedSiblings[i].x) {
              rightSibling = sortedSiblings[i];
              leftSibling = i > 0 ? sortedSiblings[i - 1] : null;
              newIndex = i;
              break;
            }
          }

          if (rightSibling === null) {
            leftSibling = sortedSiblings[sortedSiblings.length - 1];
            rightSibling = null;
            newIndex = sortedSiblings.length;
          }

          const range = rangeUnordered(newIndex, graph._dragOriginalIndex);
          parent.children.forEach((childNode, i) => {
            const subtree = childNode.descendants
              ? childNode.descendants()
              : [childNode];

            subtree.forEach((d) => {
              if (d._originalX === undefined) d._originalX = d.x;
              if (d._originalY === undefined) d._originalY = d.y;
            });

            if (i === graph._dragOriginalIndex) return;

            const moveLeft =
              range.includes(i) && i < graph._dragOriginalIndex;
            const moveRight =
              range.includes(i) && i > graph._dragOriginalIndex;

            if (moveLeft || moveRight) {
              const referenceIndex = moveLeft ? i + 1 : i - 1;
              const space = Math.abs(
                childNode.x - graph._dragSiblingXPositions[referenceIndex],
              );

              subtree.forEach((d) => {
                d.x += moveLeft ? space : -space;

                graph.main
                  .selectAll(".circleG")
                  .filter((nodeD) => nodeD.id === d.id)
                  .attr("transform", graph.getNodeTransform(d));
              });

              graph.main
                .select("#links")
                .selectAll("path")
                .filter(
                  (l) =>
                    subtree.some((n) => n.id === l.source.id) ||
                    subtree.some((n) => n.id === l.target.id),
                )
                .attr("d", (l) => graph.getLinkPath(l));
            } else {
              subtree.forEach((d) => {
                d.x = d._originalX;
                d.y = d._originalY;

                graph.main
                  .selectAll(".circleG")
                  .filter((nodeD) => nodeD.id === d.id)
                  .attr("transform", graph.getNodeTransform(d));
              });

              graph.main
                .select("#links")
                .selectAll("path")
                .filter(
                  (l) =>
                    subtree.some((n) => n.id === l.source.id) ||
                    subtree.some((n) => n.id === l.target.id),
                )
                .attr("d", (l) => graph.getLinkPath(l));
            }
          });

          graph.newIndex = newIndex;

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
      } else if (graph.nodesDragged.length === 1 && graph.onDrag) {
        const hasHighlightedSibling = !graph.main
          .selectAll(".circleG.highlight-sibling")
          .empty();

        if (hasHighlightedSibling) {
          graph.onChangeOrder(node, graph.newIndex);
        } else {
          graph.drawHierarchy(graph.root);
        }
        d3.select(this).select(".showCircle").classed("selectedNode", false);
      } else if (!graph.onDrag) {
        graph.onNodeClick(node);
      } else {
        graph.drawHierarchy(graph.root, true);
      }
      graph.svg.selectAll(".ghostCircle").attr("fill-opacity", 0);
      graph.resetDragVisualState();
      graph.targetNode = null;
      graph.nodesDragged = [];
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

export function onNodeClick(node) {
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
  this.scheduleNavioSync(transitionDuration + 16);
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
      return;
    }

    nodesInside.forEach((node) => {
      vis.svg
        .selectAll(".circleG")
        .filter((d) => d.id === node.id)
        .select(".showCircle")
        .classed("selectedNode", true);
    });

    removeBrush();
  }

  function removeBrush() {
    vis.svg.selectAll(".brush").remove();
    vis.svg.on(".brush", null);
    vis.svg.call(vis.zoomBehaviour);
  }

  return brush;
}
