import * as d3 from "d3";

export function getChartTooltip() {
  const tooltip = d3.select("body").select("div.tooltip");
  return tooltip.empty()
    ? d3.select("body").append("div").attr("class", "tooltip")
    : tooltip;
}
