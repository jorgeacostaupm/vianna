import { truncateSvgText } from "@/utils/chartLegend";

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
  orderedGroups.forEach((group, index) => {
    const y = index * lineHeight + circleSize * 2;

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
    const y = orderedGroups.length * lineHeight + circleSize * 2 + 10;
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
