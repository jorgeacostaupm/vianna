import * as d3 from "d3";

import { moveTooltip } from "@/utils/functions";

import {
  buildNodeKey,
  hasSelectedNodes,
  valueToKey,
} from "./discreteAggregation";
import {
  buildLeadingRoundedRectPath,
  buildRoundedRectPath,
  createRatioScale,
  formatRatio,
  getDiscreteNodeWidthFromBandwidth,
  getRectEdgePoint,
  normalizePixelRange,
} from "./discreteGeometry";

export function renderDiscreteAggregated({
  chart,
  x,
  y,
  color,
  activeGroup,
  tooltip,
  discreteAggregates,
  selectedNodesByVisit,
  onToggleNodeSelection,
  onNodeHover,
  onEdgeHover,
  hoveredEdge,
  ratioNodeScale = "sqrt",
  ratioEdgeScale = "sqrt",
  ratioNodeMinPx = 10,
  ratioNodeMaxPx = 30,
  ratioEdgeMinPx = 2.5,
  ratioEdgeMaxPx = 16,
}) {
  if (!discreteAggregates) return;

  const {
    nodes,
    edges,
    nodeTotals,
    nodeCompatibleCounts,
    edgeTotals,
    edgeCompatibleCounts,
  } = discreteAggregates;

  const activeColor = color(activeGroup);
  const hasActiveNodeSelection = hasSelectedNodes(selectedNodesByVisit);
  const maxNodeTotal = Math.max(
    1,
    ...nodes.map((node) => nodeTotals.get(node.key) || 0),
  );
  const maxEdgeTotal = Math.max(
    1,
    ...edges.map((edge) => edgeTotals.get(edge.key) || 0),
  );
  const nodeRange = normalizePixelRange(
    ratioNodeMinPx,
    ratioNodeMaxPx,
    10,
    30,
    1,
  );
  const edgeRange = normalizePixelRange(
    ratioEdgeMinPx,
    ratioEdgeMaxPx,
    2.5,
    16,
    0.5,
  );
  const nodeHeightScale = createRatioScale(ratioNodeScale, maxNodeTotal, nodeRange);
  const edgeWidthScale = createRatioScale(ratioEdgeScale, maxEdgeTotal, edgeRange);
  const nodeWidth = getDiscreteNodeWidthFromBandwidth(x.bandwidth());

  const nodeCenters = new Map();
  nodes.forEach((node) => {
    const centerX = x(String(node.visit)) + x.bandwidth() / 2;
    const centerY = y(Number(node.value));
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return;

    const total = nodeTotals.get(node.key) || 0;
    const height = nodeHeightScale(Math.max(1, total));
    nodeCenters.set(node.key, {
      x: centerX,
      y: centerY,
      width: nodeWidth,
      height,
    });
  });

  const edgeLayer = chart.append("g").attr("class", "discrete-aggregated-edges");
  const edgeGroups = edgeLayer
    .selectAll("g.discrete-edge")
    .data(edges, (edge) => edge.key)
    .join("g")
    .attr("class", "discrete-edge");

  edgeGroups.append("line").attr("class", "discrete-edge-base");
  edgeGroups.append("line").attr("class", "discrete-edge-compatible");

  edgeGroups.each(function (edge) {
    const sourceKey = buildNodeKey(edge.fromVisit, edge.fromValue);
    const targetKey = buildNodeKey(edge.toVisit, edge.toValue);
    const source = nodeCenters.get(sourceKey);
    const target = nodeCenters.get(targetKey);

    if (!source || !target) {
      d3.select(this).style("display", "none");
      return;
    }

    const total = edgeTotals.get(edge.key) || 0;
    const compatible = edgeCompatibleCounts.get(edge.key) || 0;
    const ratio = total > 0 ? compatible / total : 0;
    const baseWidth = edgeWidthScale(Math.max(1, total));
    const isHovered = hoveredEdge?.key === edge.key;
    const sourcePoint = getRectEdgePoint(source, target);
    const targetPoint = getRectEdgePoint(target, source);

    d3.select(this)
      .style("display", null)
      .select(".discrete-edge-base")
      .attr("x1", sourcePoint.x)
      .attr("y1", sourcePoint.y)
      .attr("x2", targetPoint.x)
      .attr("y2", targetPoint.y)
      .attr("stroke", activeColor)
      .attr("stroke-width", baseWidth)
      .attr("stroke-opacity", isHovered ? 0.35 : 0.18)
      .attr("stroke-linecap", "round");

    d3.select(this)
      .select(".discrete-edge-compatible")
      .attr("x1", sourcePoint.x)
      .attr("y1", sourcePoint.y)
      .attr("x2", targetPoint.x)
      .attr("y2", targetPoint.y)
      .attr("stroke", activeColor)
      .attr("stroke-width", baseWidth * ratio)
      .attr("stroke-opacity", ratio > 0 ? 1 : 0)
      .attr("stroke-linecap", "round");

    d3.select(this)
      .on("mouseover", function () {
        const html = `
          <strong>Transition</strong><br/>
          ${edge.fromVisit}: ${edge.fromValue} → ${edge.toVisit}: ${edge.toValue}<br/>
          Total: ${total}<br/>
          Compatible: ${compatible}<br/>
          Ratio: ${formatRatio(compatible, total)}
        `;
        onEdgeHover?.(edge);
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        onEdgeHover?.(null);
        tooltip.style("opacity", 0);
      });
  });

  const nodeLayer = chart.append("g").attr("class", "discrete-aggregated-nodes");
  const nodeGroups = nodeLayer
    .selectAll("g.discrete-node")
    .data(nodes, (node) => node.key)
    .join("g")
    .attr("class", "discrete-node");

  nodeGroups
    .append("rect")
    .attr("class", "discrete-node-base")
    .attr("rx", 4)
    .attr("ry", 4);

  nodeGroups.append("path").attr("class", "discrete-node-compatible");

  nodeGroups
    .append("rect")
    .attr("class", "discrete-node-outline")
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "none");

  nodeGroups.each(function (node) {
    const center = nodeCenters.get(node.key);
    if (!center) {
      d3.select(this).style("display", "none");
      return;
    }

    const total = nodeTotals.get(node.key) || 0;
    const compatible = nodeCompatibleCounts.get(node.key) || 0;
    const ratio = total > 0 ? compatible / total : 0;
    const selectedValues = selectedNodesByVisit?.[String(node.visit)];
    const isSelected = selectedValues?.has(valueToKey(node.value)) || false;
    const left = center.x - center.width / 2;
    const top = center.y - center.height / 2;

    d3.select(this)
      .style("display", null)
      .attr("transform", `translate(${left},${top})`);

    d3.select(this)
      .select(".discrete-node-base")
      .attr("width", center.width)
      .attr("height", center.height)
      .attr("fill", d3.interpolateRgb("#ffffff", activeColor)(0.2))
      .attr("fill-opacity", 1);

    d3.select(this)
      .select(".discrete-node-compatible")
      .attr(
        "d",
        hasActiveNodeSelection
          ? buildLeadingRoundedRectPath(
              0,
              0,
              center.width * ratio,
              center.height,
              4,
            )
          : buildRoundedRectPath(0, 0, center.width * ratio, center.height, 4),
      )
      .attr("fill", activeColor)
      .attr("fill-opacity", ratio > 0 ? 1 : 0);

    d3.select(this)
      .select(".discrete-node-outline")
      .attr("width", center.width)
      .attr("height", center.height)
      .attr("stroke", isSelected ? "var(--color-ink)" : "none")
      .attr("stroke-width", isSelected ? 2.6 : 0)
      .attr("stroke-opacity", isSelected ? 1 : 0);

    d3.select(this)
      .on("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        onToggleNodeSelection?.(node.visit, node.value);
      })
      .on("mouseover", function () {
        const html = `
          <strong>Node</strong><br/>
          Visit: ${node.visit}<br/>
          Value: ${node.value}<br/>
          Total: ${total}<br/>
          Compatible: ${compatible}<br/>
          Ratio: ${formatRatio(compatible, total)}
        `;
        onNodeHover?.(node);
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        onNodeHover?.(null);
        tooltip.style("opacity", 0);
      });
  });
}
