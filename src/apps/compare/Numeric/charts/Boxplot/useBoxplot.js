import * as d3 from "d3";
import { useEffect } from "react";
import { useSelector } from "react-redux";

import { moveTooltip } from "@/utils/functions";
import {
  numMargin,
  renderLegend,
  getGroupCounts,
  formatGroupCountLabel,
} from "../Density/useDensity";
import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { CHART_OUTLINE, CHART_OUTLINE_MUTED } from "@/utils/chartTheme";
import { paintLayersInOrder } from "@/utils/gridInteractions";

export default function useBoxplot({ chartRef, legendRef, data, config }) {
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

  const {
    pointSize,
    showPoints,
    showLegend,
    showGrid,
    showGroupCountInLegend = true,
    showGroupCountInAxis = true,
  } = config;

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;

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

    const x = d3
      .scaleBand()
      .domain(selectionGroups)
      .range([0, chartWidth])
      .padding(0.4);

    const grouped = d3.group(data, (d) => d.type);
    const groupCounts = getGroupCounts(data, selectionGroups);

    const boxStatsByGroup = Array.from(grouped, ([group, values]) => {
      const numericValues = values.map((d) => d.value);
      const stats = computeBoxStats(numericValues);
      return {
        group,
        lower: stats.lower,
        upper: stats.upper,
      };
    });

    let yDomain;
    if (showPoints) {
      yDomain = [d3.min(data, (d) => d.value), d3.max(data, (d) => d.value)];
    } else {
      yDomain = [
        d3.min(boxStatsByGroup, (d) => d.lower),
        d3.max(boxStatsByGroup, (d) => d.upper),
      ];
    }

    const y = d3.scaleLinear().domain(yDomain).nice().range([chartHeight, 0]);

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

    function computeBoxStats(values) {
      values = values.sort(d3.ascending);
      const q1 = d3.quantile(values, 0.25);
      const median = d3.quantile(values, 0.5);
      const q3 = d3.quantile(values, 0.75);
      const iqr = q3 - q1;
      const mildLower = q1 - 1.5 * iqr;
      const mildUpper = q3 + 1.5 * iqr;
      const extremeLower = q1 - 3 * iqr;
      const extremeUpper = q3 + 3 * iqr;
      const lower = Math.max(d3.min(values), mildLower);
      const upper = Math.min(d3.max(values), mildUpper);

      return {
        q1,
        median,
        q3,
        iqr,
        lower,
        upper,
        mildLower,
        mildUpper,
        extremeLower,
        extremeUpper,
      };
    }

    const groupsG = chart
      .selectAll(".boxplot")
      .data(selectionGroups)
      .join("g")
      .attr("class", "boxplot")
      .attr("transform", (d) => `translate(${x(d)}, 0)`);

    groupsG.each(function (group) {
      const g = d3.select(this);
      const values = (grouped.get(group) || []).map((d) => d.value);

      if (values.length === 0) return;

      const stats = computeBoxStats(values);
      const bandWidth = x.bandwidth();
      const boxWidth = bandWidth;
      const boxOffset = (bandWidth - boxWidth) / 2;
      const boxCenter = boxOffset + boxWidth / 2;
      const jitterWidth = boxWidth * 0.6;
      const crossSize = pointSize * 1.2;
      const points = (grouped.get(group) || []).map((d) => {
        const value = d.value;
        const isExtreme =
          value < stats.extremeLower || value > stats.extremeUpper;
        const isMild =
          !isExtreme && (value < stats.mildLower || value > stats.mildUpper);
        return {
          ...d,
          _jitter: (Math.random() - 0.5) * jitterWidth,
          _isExtreme: isExtreme,
          _isMild: isMild,
        };
      });

      // ----- Box -----
      g.append("rect")
        .attr("class", "box")
        .attr("x", boxOffset)
        .attr("y", y(stats.q3))
        .attr("width", boxWidth)
        .attr("height", y(stats.q1) - y(stats.q3))
        .attr("fill", color(group))
        .attr("stroke", CHART_OUTLINE)
        .on("mouseover", function () {
          tooltip
            .style("visibility", "visible")
            .html(
              `
              <strong>${group}</strong><br/>
              <strong>n = ${values.length}</strong><br/>
              Q1: ${stats.q1.toFixed(2)}<br/>
              Median: ${stats.median.toFixed(2)}<br/>
              Q3: ${stats.q3.toFixed(2)}<br/>
              Min (whisker): ${stats.lower.toFixed(2)}<br/>
              Max (whisker): ${stats.upper.toFixed(2)}
            `,
            )
            .style("opacity", 1);
        })
        .on("mousemove", (e) => {
          moveTooltip(e, tooltip, chart);
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      // ----- Median line -----
      g.append("line")
        .attr("class", "box-median")
        .attr("x1", boxOffset)
        .attr("x2", boxOffset + boxWidth)
        .attr("y1", y(stats.median))
        .attr("y2", y(stats.median))
        .attr("stroke", CHART_OUTLINE)
        .attr("stroke-width", 2);

      // ----- Whiskers -----
      g.append("line")
        .attr("class", "box-whisker")
        .attr("x1", boxCenter)
        .attr("x2", boxCenter)
        .attr("y1", y(stats.lower))
        .attr("y2", y(stats.q1))
        .attr("stroke", CHART_OUTLINE);

      g.append("line")
        .attr("class", "box-whisker")
        .attr("x1", boxCenter)
        .attr("x2", boxCenter)
        .attr("y1", y(stats.q3))
        .attr("y2", y(stats.upper))
        .attr("stroke", CHART_OUTLINE);

      // ----- Whisker caps -----
      g.append("line")
        .attr("class", "box-cap")
        .attr("x1", boxCenter - boxWidth * 0.3)
        .attr("x2", boxCenter + boxWidth * 0.3)
        .attr("y1", y(stats.lower))
        .attr("y2", y(stats.lower))
        .attr("stroke", CHART_OUTLINE);

      g.append("line")
        .attr("class", "box-cap")
        .attr("x1", boxCenter - boxWidth * 0.3)
        .attr("x2", boxCenter + boxWidth * 0.3)
        .attr("y1", y(stats.upper))
        .attr("y2", y(stats.upper))
        .attr("stroke", CHART_OUTLINE);

      // ---- Scatter points with jitter ----
      g.selectAll(".point")
        .data(points.filter((d) => !d._isMild && !d._isExtreme))
        .join("circle")
        .attr("class", "point")
        .classed("hide", !showPoints)
        .attr("cx", (d) => boxCenter + d._jitter)
        .attr("cy", (d) => y(d.value))
        .attr("fill", CHART_OUTLINE_MUTED)
        .attr("opacity", 0.7)
        .attr("r", pointSize)
        .on("mouseover", function (e, d) {
          tooltip.style("visibility", "visible").html(`
            <strong>${group}</strong><br/>
            Value: ${d.value.toFixed(2)}
          `);
        })
        .on("mousemove", (e) => moveTooltip(e, tooltip, chart))
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      g.selectAll(".outlier-mild")
        .data(points.filter((d) => d._isMild))
        .join("circle")
        .attr("class", "outlier-mild")
        .classed("hide", !showPoints)
        .attr("cx", (d) => boxCenter + d._jitter)
        .attr("cy", (d) => y(d.value))
        .attr("fill", "white")
        .attr("fill-opacity", 0.01)
        .attr("stroke", CHART_OUTLINE_MUTED)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.9)
        .attr("pointer-events", "all")
        .attr("r", pointSize)
        .on("mouseover", function (e, d) {
          tooltip.style("visibility", "visible").html(`
            <strong>${group}</strong><br/>
            Value: ${d.value.toFixed(2)}
          `);
        })
        .on("mousemove", (e) => moveTooltip(e, tooltip, chart))
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      const extreme = g
        .selectAll(".outlier-extreme")
        .data(points.filter((d) => d._isExtreme))
        .join(
          (enter) => {
            const gEnter = enter.append("g").attr("class", "outlier-extreme");
            gEnter.append("line").attr("class", "x1");
            gEnter.append("line").attr("class", "x2");
            return gEnter;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .classed("hide", !showPoints)
        .attr(
          "transform",
          (d) => `translate(${boxCenter + d._jitter}, ${y(d.value)})`,
        )
        .attr("opacity", 0.9)
        .on("mouseover", function (e, d) {
          tooltip.style("visibility", "visible").html(`
            <strong>${group}</strong><br/>
            Value: ${d.value.toFixed(2)}
          `);
        })
        .on("mousemove", (e) => moveTooltip(e, tooltip, chart))
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

      extreme
        .select("line.x1")
        .attr("x1", -crossSize)
        .attr("y1", -crossSize)
        .attr("x2", crossSize)
        .attr("y2", crossSize)
        .attr("stroke", CHART_OUTLINE_MUTED)
        .attr("stroke-width", 1.5);

      extreme
        .select("line.x2")
        .attr("x1", -crossSize)
        .attr("y1", crossSize)
        .attr("x2", crossSize)
        .attr("y2", -crossSize)
        .attr("stroke", CHART_OUTLINE_MUTED)
        .attr("stroke-width", 1.5);
    });

    if (showLegend !== false) {
      renderLegend(legend, selectionGroups, color, {
        labelByGroup: showGroupCountInLegend
          ? (group) => formatGroupCountLabel(group, groupCounts)
          : undefined,
      });
    }

    const yGridG = showGrid
      ? chart
        .append("g")
        .attr("class", "grid y-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(""))
        .call((g) => g.select(".domain").remove())
      : null;

    if (yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }
  }, [
    data,
    dimensions,
    groupsKey,
    showPoints,
    showLegend,
    showGrid,
    colorDomain,
  ]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = d3.select(chartRef.current);
    const crossSize = pointSize * 1.2;
    chart.selectAll(".point").attr("r", pointSize);
    chart.selectAll(".outlier-mild").attr("r", pointSize);
    chart.selectAll(".outlier-extreme").each(function () {
      const g = d3.select(this);
      g.select("line.x1")
        .attr("x1", -crossSize)
        .attr("y1", -crossSize)
        .attr("x2", crossSize)
        .attr("y2", crossSize);
      g.select("line.x2")
        .attr("x1", -crossSize)
        .attr("y1", crossSize)
        .attr("x2", crossSize)
        .attr("y2", -crossSize);
    });
  }, [pointSize]);
}
