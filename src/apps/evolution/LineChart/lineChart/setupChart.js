import * as d3 from "d3";

import { numMargin } from "@/apps/compare/Numeric/charts/Density/useDensity";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";
import { attachTickLabelGridHover } from "@/utils/gridInteractions";
import { appendLegendRoot, createLegendLayout } from "@/utils/chartLegend";

export function initializeLineChartScene({
  chartRef,
  dimensions,
  selectionTimestamps,
  colorDomain,
  yDomain,
  useNiceY = true,
  showGrid,
  showLegend,
  legendMaxWidth = 208,
}) {
  const { width, height } = dimensions;
  const legendLayout = createLegendLayout({
    width,
    height,
    margin: numMargin,
    showLegend,
    legendMaxWidth,
    minChartWidth: 240,
  });
  const { chartWidth, chartHeight } = legendLayout;
  const [yMin, yMax] = yDomain;

  const svg = d3.select(chartRef.current);
  const legend = appendLegendRoot(svg, legendLayout);
  const chart = svg
    .append("g")
    .attr("transform", `translate(${numMargin.left},${numMargin.top})`);

  const color = d3
    .scaleOrdinal()
    .domain(colorDomain)
    .range(GROUP_CATEGORICAL_PALETTE);

  const x = d3
    .scaleBand()
    .domain(selectionTimestamps)
    .range([0, chartWidth])
    .padding(0.2);
  const y = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight, 0]);

  if (useNiceY) {
    y.nice(5);
  }

  let yGridG = null;
  if (showGrid) {
    yGridG = chart
      .append("g")
      .attr("class", "grid y-grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(""))
      .call((group) => group.select(".domain").remove());
  }

  const xAxisG = chart
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x));
  xAxisG.select(".domain").remove();
  xAxisG.selectAll(".tick line").remove();

  const yAxisG = chart.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));
  yAxisG.select(".domain").remove();
  yAxisG.selectAll(".tick line").remove();

  if (showGrid && yGridG) {
    attachTickLabelGridHover({
      axisGroup: yAxisG,
      gridGroup: yGridG,
    });
  }

  let tooltip = d3.select("body").select("div.tooltip");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  return {
    svg,
    legend,
    chart,
    color,
    x,
    y,
    xAxisG,
    yAxisG,
    yGridG,
    tooltip,
    chartWidth,
    chartHeight,
    legendLayout,
  };
}
