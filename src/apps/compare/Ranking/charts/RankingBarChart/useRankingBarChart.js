import * as d3 from "d3";
import { useEffect, useRef } from "react";

import useResizeObserver from "@/hooks/useResizeObserver";
import { formatDecimal, moveTooltip } from "@/utils/functions";
import { CHART_GRID } from "@/utils/chartTheme";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";
import {
  getRankingMagnitude,
  getVisibleRankingData,
} from "../../rankingFilters";

const margins = { top: 50, right: 30, bottom: 60, left: 90 };

export default function useRankingBarChart({
  chartRef,
  data,
  config,
  onVariableClick,
}) {
  const dimensions = useResizeObserver(chartRef);
  const selectedVarRef = useRef(null);

  useEffect(() => {
    if (!dimensions || !chartRef.current || !data?.data?.length) return;

    const { width, height } = dimensions;
    const chartWidth = width - margins.left - margins.right;
    const chartHeight = height - margins.top - margins.bottom;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margins.left}, ${margins.top})`);

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    let descTooltip = d3.select("body").select("div.descTooltip");
    if (descTooltip.empty()) {
      descTooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip descTooltip");
    }

    const filteredData = getVisibleRankingData(data.data, config);

    if (!filteredData.length) {
      return;
    }

    const xScale = d3
      .scaleBand()
      .domain(filteredData.map((item) => item.variable))
      .range([0, chartWidth])
      .padding(0.2);

    const yMax = d3.max(filteredData, getRankingMagnitude) || 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([chartHeight, 0]);

    const xAxisG = chart
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0));

    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();
    xAxisG
      .selectAll("text")
      .attr("transform", "translate(0,0)rotate(-15)")
      .style("text-anchor", "end");

    const yAxis = d3.axisLeft(yScale).ticks(4);
    if (config.showGrid) {
      yAxis.tickSize(-chartWidth);
    }

    const yAxisG = chart.append("g").attr("class", "y-axis").call(yAxis);
    yAxisG.select(".domain").remove();

    if (config.showGrid) {
      yAxisG.selectAll(".tick line").attr("stroke", CHART_GRID);

      attachTickLabelGridHover({
        axisGroup: yAxisG,
        gridGroup: yAxisG,
        lineSelector: "line",
        includeTick: () => true,
      });

      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG],
      });
    } else {
      yAxisG.selectAll(".tick line").remove();
      yAxisG
        .selectAll(".tick text")
        .on("mouseover.grid-line-highlight", null)
        .on("mouseout.grid-line-highlight", null);
    }

    chart
      .append("text")
      .attr("class", "yAxisLabel")
      .attr("transform", "translate(0,-15)")
      .attr("text-anchor", "middle")
      .text(data.measure || "");

    chart
      .selectAll(".bar")
      .data(filteredData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (item) => xScale(item.variable))
      .attr("y", (item) => yScale(getRankingMagnitude(item)))
      .attr("width", xScale.bandwidth())
      .attr(
        "height",
        (item) => chartHeight - yScale(getRankingMagnitude(item)),
      )
      .attr("fill", "var(--primary-color)")
      .style("cursor", "pointer")
      .classed("selected", (item) => item.variable === selectedVarRef.current)
      .on("click", function (_, item) {
        selectedVarRef.current = item.variable;
        chart
          .selectAll(".bar")
          .classed("selected", (d) => d.variable === selectedVarRef.current);

        if (typeof onVariableClick === "function") {
          onVariableClick(item.variable);
        }
      })
      .on("mouseover", function (event, item) {
        const pValue = item.p_value ?? item.pValue;
        const effectSize = getRankingMagnitude(item).toFixed(3);
        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${item.variable}</strong><br/>${data.measure}: ${effectSize}<br/>p-value: ${formatDecimal(pValue)}`,
          );
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      });

    xAxisG
      .selectAll(".tick")
      .on("mouseover", function (event, variable) {
        const description =
          filteredData.find((item) => item.variable === variable)
            ?.description || "-";

        descTooltip.style("opacity", 1).html(`${variable}: ${description}`);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, descTooltip, chart);
      })
      .on("mouseout", function () {
        descTooltip.style("opacity", 0);
      });
  }, [dimensions, data, config, onVariableClick, chartRef]);
}
