import * as d3 from "d3";
import { getChartTooltip } from "@/utils/chartTooltip";
import { useEffect } from "react";

import useResizeObserver from "@/hooks/useResizeObserver";
import { moveTooltip } from "@/utils/functions";
import { CHART_GRID, CHART_OUTLINE, CHART_ZERO_LINE } from "@/utils/chartTheme";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

export default function usePointRangeChart({
  containerRef,
  id,
  data,
  config,
  colorDomain,
}) {
  const dims = useResizeObserver(containerRef);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    if (!dims || !data?.summaries?.length) {
      return;
    }

    const { showCaps, capSize, markerShape, markerSize, showZeroLine, sortBy } = config;
    const sortedData = [...data.summaries].sort((a, b) => {
      if (sortBy === "value") return b.value - a.value;
      return String(a.name).localeCompare(String(b.name));
    });

    const margin = { top: 50, right: 50, bottom: 50, left: 120 };
    const totalWidth = dims.width;
    const totalHeight = dims.height;
    const chartWidth = totalWidth - margin.left - margin.right;
    const chartHeight = totalHeight - margin.top - margin.bottom;

    const tooltip = getChartTooltip();

    const svg = container
      .append("svg")
      .attr("id", id)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block");

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const pointColorScale = d3
      .scaleOrdinal()
      .domain(colorDomain || [])
      .range(GROUP_CATEGORICAL_PALETTE);

    const x = d3
      .scaleBand()
      .domain(sortedData.map((item) => item.name))
      .range([0, chartWidth])
      .padding(0.4);

    const y = d3
      .scaleLinear()
      .domain([
        d3.min(sortedData, (item) => item.ci95.lower),
        d3.max(sortedData, (item) => item.ci95.upper),
      ])
      .range([chartHeight, 0])
      .nice();

    const yTickCount = 4;

    const yGridG = chart
      .append("g")
      .attr("class", "grid y-grid")
      .call(d3.axisLeft(y).ticks(yTickCount).tickSize(-chartWidth).tickFormat(""));
    yGridG.select(".domain").remove();
    yGridG.selectAll(".tick line").attr("stroke", CHART_GRID);

    const yAxisG = chart.append("g").call(d3.axisLeft(y).ticks(yTickCount));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    const xAxisG = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();

    if (showZeroLine && y.domain()[0] < 0 && y.domain()[1] > 0) {
      chart
        .append("line")
        .attr("class", "zero-line")
        .attr("stroke", CHART_ZERO_LINE)
        .attr("stroke-dasharray", "4 2")
        .attr("x1", 0)
        .attr("x2", chartWidth)
        .attr("y1", y(0) + 0.5)
        .attr("y2", y(0) + 0.5);
    }

    const tooltipContent = (item) =>
      `<strong>${item.name}</strong><br/>${item.measure}: ${item.value.toFixed(2)}<br/>CI: [${item.ci95.lower.toFixed(2)}, ${item.ci95.upper.toFixed(2)}]`;

    chart
      .selectAll(".ci-line")
      .data(sortedData)
      .join("line")
      .attr("class", "ci-line")
      .attr("stroke", CHART_OUTLINE)
      .attr("stroke-width", 1.8)
      .attr("x1", (item) => x(item.name) + x.bandwidth() / 2)
      .attr("x2", (item) => x(item.name) + x.bandwidth() / 2)
      .attr("y1", (item) => y(item.ci95.lower))
      .attr("y2", (item) => y(item.ci95.upper))
      .on("mouseover", (event, item) => {
        tooltip.html(tooltipContent(item)).style("visibility", "visible");
      })
      .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    if (showCaps) {
      chart
        .selectAll(".cap-left")
        .data(sortedData)
        .join("line")
        .attr("class", "cap-left")
        .attr("stroke", CHART_OUTLINE)
        .attr("stroke-width", 1.6)
        .attr("x1", (item) => x(item.name) + x.bandwidth() / 2 - capSize)
        .attr("x2", (item) => x(item.name) + x.bandwidth() / 2 + capSize)
        .attr("y1", (item) => y(item.ci95.lower))
        .attr("y2", (item) => y(item.ci95.lower));

      chart
        .selectAll(".cap-right")
        .data(sortedData)
        .join("line")
        .attr("class", "cap-right")
        .attr("stroke", CHART_OUTLINE)
        .attr("stroke-width", 1.6)
        .attr("x1", (item) => x(item.name) + x.bandwidth() / 2 - capSize)
        .attr("x2", (item) => x(item.name) + x.bandwidth() / 2 + capSize)
        .attr("y1", (item) => y(item.ci95.upper))
        .attr("y2", (item) => y(item.ci95.upper));
    }

    if (markerShape === "circle") {
      chart
        .selectAll(".mean-point")
        .data(sortedData)
        .join("circle")
        .attr("class", "mean-point")
        .attr("cx", (item) => x(item.name) + x.bandwidth() / 2)
        .attr("cy", (item) => y(item.value))
        .attr("r", markerSize);
    } else {
      const symbolType = markerShape === "square" ? d3.symbolSquare : d3.symbolDiamond;
      const symbol = d3.symbol().type(symbolType).size(markerSize * markerSize * 4);

      chart
        .selectAll(".mean-point")
        .data(sortedData)
        .join("path")
        .attr("class", "mean-point")
        .attr("d", symbol)
        .attr(
          "transform",
          (item) => `translate(${x(item.name) + x.bandwidth() / 2},${y(item.value)})`,
        );
    }

    chart
      .selectAll(".mean-point")
      .attr("fill", (item) => pointColorScale(item.name))
      .on("mouseover", (event, item) => {
        tooltip.html(tooltipContent(item)).style("visibility", "visible");
      })
      .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    attachTickLabelGridHover({
      axisGroup: yAxisG,
      gridGroup: yGridG,
    });

    paintLayersInOrder({
      chartGroup: chart,
      layers: [xAxisG, yAxisG, yGridG],
    });
  }, [containerRef, dims, id, data, config, colorDomain]);
}
