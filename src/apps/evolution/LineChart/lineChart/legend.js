import * as d3 from "d3";
import { truncateSvgText } from "@/utils/chartLegend";

import {
  buildLeadingRoundedRectPath,
  buildRoundedRectPath,
} from "./discreteGeometry";

export function renderLineLegend(
  legend,
  groups,
  color,
  hide,
  setHide,
  {
    onItemMouseOver,
    onItemMouseOut,
    onCircleClick,
    clearSelectionVisible = false,
    onClearSelection,
    showDiscreteAggregatedLegend = false,
    discreteLegendColor = "#4f46e5",
    discreteHasSelection = false,
    maxWidth = null,
  } = {},
) {
  const circleSize = 10;
  const padding = 6;
  const lineHeight = circleSize * 2 + padding;

  const legendGroup = legend
    .append("g")
    .attr("class", "legend-group")
    .style("cursor", "pointer");

  const orderedGroups = Array.isArray(groups) ? [...groups] : [];
  const discreteLegendHeight = showDiscreteAggregatedLegend
    ? renderDiscreteLegendBlock(legendGroup, {
        y: 0,
        color: discreteLegendColor,
        hasSelection: discreteHasSelection,
      })
    : 0;
  const legendStartY = discreteLegendHeight > 0 ? discreteLegendHeight + 14 : 0;

  orderedGroups.forEach((group, index) => {
    const y = legendStartY + index * lineHeight + circleSize * 2;

    const legendItem = legendGroup
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(0,${y})`)
      .datum(group)
      .on("mouseover", () => onItemMouseOver?.(group))
      .on("mouseout", () => onItemMouseOut?.())
      .on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const groupKey = String(group);

        setHide((prev) => {
          const normalized = prev.map((entry) => String(entry));
          const isHidden = normalized.includes(groupKey);
          const next = isHidden
            ? normalized.filter((entry) => entry !== groupKey)
            : [...normalized, groupKey];

          legendItem.select(".legend-label").classed("cross", !isHidden);
          return next;
        });
      });

    legendItem
      .append("circle")
      .attr("class", "legend-circle")
      .attr("cx", circleSize + 10)
      .attr("cy", 0)
      .attr("r", circleSize)
      .style("fill", color(group))
      .on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onCircleClick?.(group);
      });

    legendItem
      .append("text")
      .attr("class", "legend-label")
      .classed(
        "cross",
        hide.map((entry) => String(entry)).includes(String(group)),
      )
      .attr("x", circleSize * 2 + 15)
      .attr("y", 4)
      .text(group);
  });

  if (clearSelectionVisible) {
    const y =
      legendStartY + orderedGroups.length * lineHeight + circleSize * 2 + 10;
    legendGroup
      .append("text")
      .attr("class", "legend-label")
      .attr("x", circleSize + 10)
      .attr("y", y)
      .style("font-weight", 700)
      .style("text-decoration", "underline")
      .text("Clear selection")
      .on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClearSelection?.();
      });
  }
  truncateSvgText(legendGroup.selectAll(".legend-label"), maxWidth);
}

function renderDiscreteLegendBlock(
  legendGroup,
  { y = 0, color = "#4f46e5", hasSelection = false } = {},
) {
  const block = legendGroup
    .append("g")
    .attr("class", "discrete-legend-block")
    .attr("transform", `translate(0, ${y})`);
  const blockWidth = 246;
  const blockHeight = 144;

  block
    .append("rect")
    .attr("x", -8)
    .attr("y", -14)
    .attr("width", blockWidth)
    .attr("height", blockHeight)
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("fill", "rgba(248, 250, 252, 0.9)")
    .attr("stroke", "rgba(148, 163, 184, 0.45)")
    .attr("stroke-width", 1);

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", 8)
    .style("font-weight", 700)
    .text("Ratio Mode");

  const itemX = 0;
  const item1Y = 32;
  const item2Y = 62;
  const item3Y = 96;
  const legendLineX1 = itemX + 2;
  const legendLineX2 = itemX + 38;
  const legendLineY = item3Y + 6;
  const legendLineTotalWidth = 14;
  const legendLineCompatibleRatio = 0.42;

  block
    .append("rect")
    .attr("x", itemX + 8)
    .attr("y", item1Y + 4)
    .attr("width", 14)
    .attr("height", 12)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2))
    .attr("stroke", "rgba(15, 23, 42, 0.25)");

  block
    .append("rect")
    .attr("x", itemX + 28)
    .attr("y", item1Y - 4)
    .attr("width", 14)
    .attr("height", 20)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2))
    .attr("stroke", "rgba(15, 23, 42, 0.25)");

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item1Y + 10)
    .style("font-size", "11px")
    .text("Node height = count");

  block
    .append("line")
    .attr("x1", legendLineX1)
    .attr("y1", legendLineY)
    .attr("x2", legendLineX2)
    .attr("y2", legendLineY)
    .attr("stroke", color)
    .attr("stroke-width", legendLineTotalWidth)
    .attr("stroke-opacity", 0.2)
    .attr("stroke-linecap", "butt");

  block
    .append("line")
    .attr("x1", legendLineX1)
    .attr("y1", legendLineY)
    .attr("x2", legendLineX2)
    .attr("y2", legendLineY)
    .attr("stroke", color)
    .attr("stroke-width", legendLineTotalWidth * legendLineCompatibleRatio)
    .attr("stroke-linecap", "butt");

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item3Y + 10)
    .style("font-size", "11px")
    .text("Line fill = compatible ratio");

  block
    .append("rect")
    .attr("x", itemX + 0)
    .attr("y", item2Y - 2)
    .attr("width", 36)
    .attr("height", 16)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2));

  block
    .append("path")
    .attr(
      "d",
      hasSelection
        ? buildLeadingRoundedRectPath(itemX + 0, item2Y - 2, 20, 16, 3)
        : buildRoundedRectPath(itemX + 0, item2Y - 2, 20, 16, 3),
    )
    .attr("fill", color);

  block
    .append("rect")
    .attr("x", itemX + 0)
    .attr("y", item2Y - 2)
    .attr("width", 36)
    .attr("height", 16)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", "none")
    .attr("stroke", "var(--color-ink)")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item2Y + 10)
    .style("font-size", "11px")
    .text("Fill = compatible ratio");

  return blockHeight;
}
