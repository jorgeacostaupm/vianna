import * as d3 from "d3";
import { useEffect } from "react";
import { moveTooltip } from "@/utils/functions";
import useResizeObserver from "@/hooks/useResizeObserver";
import { paintLayersInOrder } from "@/utils/gridInteractions";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";

export const catMargins = { top: 30, right: 40, bottom: 50, left: 50 };

export default function useGroupedBarChart({
  chartRef,
  legendRef,
  data,
  config,
}) {
  const dimensions = useResizeObserver(chartRef);

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;
    const { chartData, categories, categoriesWithValues, groupVar } = data;
    const { showLegend, showGrid = true, groupOrder, categoryOrder } = config || {};

    d3.select(chartRef.current).selectAll("*").remove();
    d3.select(legendRef.current).selectAll("*").remove();

    const chartWidth = width - catMargins.left - catMargins.right;
    const chartHeight = height - catMargins.top - catMargins.bottom;

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${catMargins.left},${catMargins.top})`);

    const groupTotals = new Map(
      chartData.map((d) => [
        d[groupVar],
        categories.reduce((sum, c) => sum + (d[c] || 0), 0),
      ])
    );
    const groups = chartData.map((d) => d[groupVar]);
    groups.sort((a, b) => {
      if (groupOrder === "count") {
        return (groupTotals.get(b) || 0) - (groupTotals.get(a) || 0);
      }
      return String(a).localeCompare(String(b));
    });

    const x0 = d3
      .scaleBand()
      .domain(groups)
      .range([0, chartWidth])
      .padding(0.2);

    const categoryTotals = new Map(
      categories.map((c) => [
        c,
        chartData.reduce((sum, d) => sum + (d[c] || 0), 0),
      ])
    );
    const visibleCategories =
      categoriesWithValues?.length > 0 ? categoriesWithValues : categories;
    const orderedCategories = [...visibleCategories].sort((a, b) => {
      if (categoryOrder === "count") {
        return (categoryTotals.get(b) || 0) - (categoryTotals.get(a) || 0);
      }
      return String(a).localeCompare(String(b));
    });

    const color = d3
      .scaleOrdinal()
      .domain(orderedCategories)
      .range(GROUP_CATEGORICAL_PALETTE);

    const x1 = d3
      .scaleBand()
      .domain(orderedCategories)
      .range([0, x0.bandwidth()])
      .padding(0.05);

    const maxCount = d3.max(chartData, (d) =>
      d3.max(orderedCategories, (c) => d[c])
    );
    const y = d3
      .scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([chartHeight, 0]);

    const xAxisG = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x0));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();

    let yGridG = null;
    if (showGrid) {
      yGridG = chart
        .append("g")
        .attr("class", "grid y-grid")
        .call(d3.axisLeft(y).ticks(null, "d").tickSize(-chartWidth).tickFormat(""))
        .call((g) => g.select(".domain").remove());
    }

    const yAxisG = chart.append("g").call(d3.axisLeft(y).ticks(null, "d"));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    const inactiveOpacity = 0.25;
    const setCategoryHighlight = (activeCategory = null) => {
      const hasActiveCategory = activeCategory !== null;

      chart.selectAll("rect.bar").attr("opacity", (d) => {
        if (!hasActiveCategory) return 1;
        return d.key === activeCategory ? 1 : inactiveOpacity;
      });

      legend.selectAll(".legend-item").attr("opacity", (d) => {
        if (!hasActiveCategory) return 1;
        return d === activeCategory ? 1 : inactiveOpacity;
      });
    };

    const groupG = chart
      .selectAll("g.group")
      .data(chartData)
      .enter()
      .append("g")
      .attr("class", "group")
      .attr("transform", (d) => `translate(${x0(d[groupVar])},0)`);

    groupG
      .selectAll("rect")
      .data((d) => orderedCategories.map((key) => ({ key, value: d[key] })))
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x1(d.key))
      .attr("y", (d) => y(d.value))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => chartHeight - y(d.value))
      .attr("fill", (d) => color(d.key))
      .on("mouseover", (event, d) => {
        setCategoryHighlight(d.key);
        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>Nº Items: ${d.value}</strong><br/>Category: ${d.key}<br/>`
          );
      })
      .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
      .on("mouseout", () => {
        setCategoryHighlight(null);
        tooltip.style("visibility", "hidden");
      });

    if (yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }

    if (showLegend !== false) {
      renderLegend(legend, orderedCategories, color, {
        onItemMouseOver: setCategoryHighlight,
        onItemMouseOut: () => setCategoryHighlight(null),
      });
    }
  }, [data, config, dimensions]);
}

export function renderLegend(
  legend,
  groups,
  color,
  { onItemMouseOver, onItemMouseOut } = {}
) {
  const circleSize = 10;
  const padding = 6;
  const lineHeight = circleSize * 2 + padding;

  const legendGroup = legend.append("g").attr("class", "legend-group");

  [...groups]
    .sort()
    .reverse()
    .forEach((group, i) => {
      const y = i * lineHeight + circleSize * 2;
      const legendItem = legendGroup
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", `translate(0,${y})`)
        .datum(group);

      if (onItemMouseOver || onItemMouseOut) {
        legendItem
          .style("cursor", "pointer")
          .on("mouseover", () => onItemMouseOver?.(group))
          .on("mouseout", () => onItemMouseOut?.());
      }

      legendItem
        .append("circle")
        .attr("class", "legend-circle")
        .attr("cx", circleSize + 10)
        .attr("cy", 0)
        .attr("r", circleSize)
        .style("fill", color(group));

      legendItem
        .append("text")
        .attr("class", "legend legend-label")
        .attr("x", circleSize * 2 + 15)
        .attr("y", 4)
        .text(group);
    });

  const bbox = legendGroup.node().getBBox();

  const parent = legend.node().parentNode;
  const { width, height } = parent.getBoundingClientRect();

  if (height > bbox.y + bbox.height) {
    d3.select(parent).style("align-items", "center");
  } else {
    d3.select(parent).style("align-items", null);
  }

  if (width > bbox.x + bbox.width) {
    d3.select(parent).style("justify-content", "center");
  } else {
    d3.select(parent).style("justify-content", null);
  }

  legend
    .attr("width", bbox.x + bbox.width)
    .attr("height", bbox.y + bbox.height + circleSize * 2);
}
