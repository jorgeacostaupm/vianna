import * as d3 from "d3";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import { moveTooltip } from "@/utils/functions";
import {
  numMargin,
  renderLegend,
  computeEstimator,
  getDensities,
  getYMax,
  getNumericDomain,
  getGroupCounts,
  formatGroupCountLabel,
} from "../Density/useDensity";
import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { CHART_OUTLINE_MUTED } from "@/utils/chartTheme";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

export default function useViolinplot({ chartRef, legendRef, data, config }) {
  const dimensions = useResizeObserver(chartRef);
  const groupVar = useSelector((s) => s.compare.groupVar);
  const groups = Array.from(new Set((data || []).map((d) => d.type))).filter(
    (value) => value != null
  );
  const { colorDomain, orderedGroups: selectionGroups } = useGroupColorDomain(
    groupVar,
    groups
  );
  const groupsKey = selectionGroups.join("|");

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;
    const {
      nPoints,
      useCustomRange,
      range,
      margin,
      showLegend,
      showGrid,
      showGroupCountInLegend = true,
      showGroupCountInAxis = true,
    } = config;

    d3.select(chartRef.current).selectAll("*").remove();
    d3.select(legendRef.current).selectAll("*").remove();

    const colorScheme = d3.schemeCategory10;
    const chartWidth = width - numMargin.left - numMargin.right;
    const chartHeight = height - numMargin.top - numMargin.bottom;

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${numMargin.left},${numMargin.top})`);

    const color = d3.scaleOrdinal().domain(colorDomain).range(colorScheme);

    // X for groups
    const x = d3
      .scaleBand()
      .domain(selectionGroups)
      .range([0, chartWidth])
      .padding(0.4);
    const grouped = d3.group(data, (d) => d.type);
    const groupCounts = getGroupCounts(data, selectionGroups);

    const [xMin, xMax] = getNumericDomain(data, {
      margin,
      useCustomRange,
      range,
    });

    const pointEstimator = computeEstimator(nPoints, xMin, xMax);
    const densities = getDensities(data, selectionGroups, pointEstimator);
    const maxWidth = getYMax(densities);

    const y = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .nice()
      .range([chartHeight, 0]);

    let yGridG = null;
    if (showGrid) {
      yGridG = chart
        .append("g")
        .attr("class", "grid y-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(""))
        .call((g) => g.select(".domain").remove());
    }

    const xAxisG = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();
    xAxisG.selectAll(".tick text").text((group) =>
      showGroupCountInAxis ? formatGroupCountLabel(group, groupCounts) : group,
    );

    const yAxisG = chart.append("g").call(d3.axisLeft(y).ticks(5));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    if (showGrid && yGridG) {
      attachTickLabelGridHover({
        axisGroup: yAxisG,
        gridGroup: yGridG,
      });
    }

    const baseViolinWidth = d3
      .scaleLinear()
      .range([0, x.bandwidth()])
      .domain([0, maxWidth]);

    // Group <g> for each violin
    const groupsG = chart
      .selectAll(".violinplot")
      .data(densities)
      .join("g")
      .attr("class", "violinplot")
      .attr("transform", (d) => `translate(${x(d.group)},0)`);

    groupsG.each(function (d) {
      const g = d3.select(this);
      const density = d.value;
      const group = d.group;
      const values = (grouped.get(group) || []).map((pt) => +pt.value);

      if (values.length === 0) return;
      const area = d3
        .area()
        .x0((point) => -baseViolinWidth(point[1]) / 2)
        .x1((point) => baseViolinWidth(point[1]) / 2)
        .y((point) => y(point[0]))
        .curve(d3.curveCatmullRom);

      // Draw violin
      g.append("path")
        .datum(density)
        .attr("class", "violin")
        .attr("d", area)
        .attr("fill", color(group))
        .attr("stroke", CHART_OUTLINE_MUTED)
        .attr("transform", `translate(${x.bandwidth() / 2},0)`)
        .on("mouseover", function () {
          tooltip.style("visibility", "visible").html(
            `
              <strong>${group}</strong><br/>
              n = ${values.length}<br/>
              min: ${d3.min(values).toFixed(2)}<br/>
              mean: ${d3.mean(values).toFixed(2)}<br/>
              max: ${d3.max(values).toFixed(2)}
            `,
          );
        })
        .on("mousemove", (e) => moveTooltip(e, tooltip, chart))
        .on("mouseout", () => tooltip.style("visibility", "hidden"));
    });

    if (showLegend !== false) {
      renderLegend(legend, selectionGroups, color, {
        labelByGroup: showGroupCountInLegend
          ? (group) => formatGroupCountLabel(group, groupCounts)
          : undefined,
      });
    }

    if (showGrid && yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }
  }, [data, dimensions, groupsKey, config, colorDomain]);
}
