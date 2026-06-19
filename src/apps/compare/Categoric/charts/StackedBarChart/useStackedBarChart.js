import * as d3 from "d3";
import { getChartTooltip } from "@/utils/chartTooltip";
import { useLayoutEffect } from "react";
import { moveTooltip } from "@/utils/functions";
import useResizeObserver from "@/hooks/useResizeObserver";
import { paintLayersInOrder } from "@/utils/gridInteractions";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";
import { appendLegendRoot, createLegendLayout } from "@/utils/chartLegend";
import {
  catMargins,
  renderLegend,
} from "../GroupedBarChart/useGroupedBarChart";

export default function useStackedBarChart({
  chartRef,
  data,
  config,
}) {
  const dimensions = useResizeObserver(chartRef);

  useLayoutEffect(() => {
    if (!dimensions || !data || !chartRef.current) return;

    const { width, height } = dimensions;
    const { chartData, categories, categoriesWithValues, groupVar } = data;
    const {
      showLegend,
      showGrid = true,
      groupOrder,
      categoryOrder,
      stackedMode = "total",
    } = config || {};
    const isProportionMode = stackedMode === "proportion";

    d3.select(chartRef.current).selectAll("*").remove();
    const legendLayout = createLegendLayout({
      width,
      height,
      margin: catMargins,
      showLegend: showLegend !== false,
      legendMaxWidth: 192,
      minChartWidth: 240,
    });
    const { chartWidth, chartHeight } = legendLayout;

    const tooltip = getChartTooltip();

    const svg = d3.select(chartRef.current);
    const legend = appendLegendRoot(svg, legendLayout);

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

    const x = d3.scaleBand().domain(groups).range([0, chartWidth]).padding(0.2);

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

    const stackedData = chartData.map((row) => {
      const total = orderedCategories.reduce((sum, category) => {
        return sum + (row[category] || 0);
      }, 0);
      const formattedRow = { ...row, __total: total, __rawValues: {} };

      orderedCategories.forEach((category) => {
        const rawValue = row[category] || 0;
        formattedRow.__rawValues[category] = rawValue;
        formattedRow[category] =
          isProportionMode && total > 0 ? rawValue / total : rawValue;
      });

      return formattedRow;
    });

    const stackGenerator = d3.stack().keys(orderedCategories);
    const series = stackGenerator(stackedData);

    const maxSum = isProportionMode
      ? 1
      : d3.max(stackedData, (d) =>
          orderedCategories.reduce((sum, c) => sum + (d[c] || 0), 0)
        ) || 0;
    const yDomainMax = maxSum > 0 ? maxSum : 1;

    const y = d3
      .scaleLinear()
      .domain([0, yDomainMax])
      .nice()
      .range([chartHeight, 0]);

    const color = d3
      .scaleOrdinal()
      .domain(orderedCategories)
      .range(GROUP_CATEGORICAL_PALETTE);

    const xAxisG = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();

    let yGridG = null;
    if (showGrid) {
      const yGridAxis = d3.axisLeft(y).tickSize(-chartWidth).tickFormat("");
      if (isProportionMode) {
        yGridAxis.ticks(5);
      } else {
        yGridAxis.ticks(null, "d");
      }

      yGridG = chart
        .append("g")
        .attr("class", "grid y-grid")
        .call(yGridAxis)
        .call((g) => g.select(".domain").remove());
    }

    const yAxis = d3.axisLeft(y);
    if (isProportionMode) {
      yAxis.tickFormat(d3.format(".0%"));
    } else {
      yAxis.ticks(null, "d");
    }
    const yAxisG = chart.append("g").call(yAxis);
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    const inactiveOpacity = 0.25;
    const setCategoryHighlight = (activeCategory = null) => {
      const hasActiveCategory = activeCategory !== null;

      chart.selectAll("rect.stacked-bar").attr("opacity", (d) => {
        if (!hasActiveCategory) return 1;
        return d.key === activeCategory ? 1 : inactiveOpacity;
      });

      if (legend) {
        legend.selectAll(".legend-item").attr("opacity", (d) => {
          if (!hasActiveCategory) return 1;
          return d === activeCategory ? 1 : inactiveOpacity;
        });
      }
    };

    const layer = chart
      .selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d) => color(d.key));

    layer
      .selectAll("rect")
      .data((seriesItem) =>
        seriesItem.map((point) => {
          const rawValue = point.data.__rawValues[seriesItem.key] || 0;
          const total = point.data.__total || 0;
          return {
            key: seriesItem.key,
            group: point.data[groupVar],
            y0: point[0],
            y1: point[1],
            rawValue,
            proportion: total > 0 ? rawValue / total : 0,
          };
        })
      )
      .enter()
      .append("rect")
      .attr("class", "stacked-bar")
      .attr("x", (d) => x(d.group))
      .attr("y", (d) => y(d.y1))
      .attr("height", (d) => y(d.y0) - y(d.y1))
      .attr("width", x.bandwidth())
      .on("mouseover", (e, d) => {
        setCategoryHighlight(d.key);
        const mainValue = isProportionMode
          ? `Proportion: ${d3.format(".1%")(d.proportion)}`
          : `Nº Items: ${d.rawValue}`;
        const secondaryValue = isProportionMode ? `<br/>Nº Items: ${d.rawValue}` : "";
        tooltip.style("visibility", "visible").html(
          `<strong>${mainValue}</strong>${secondaryValue}<br/>Category: ${d.key}<br/>`
        );
      })
      .on("mousemove", (e) => {
        moveTooltip(e, tooltip, chart);
      })
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

    if (showLegend !== false && legend) {
      renderLegend(legend, orderedCategories, color, {
        onItemMouseOver: setCategoryHighlight,
        onItemMouseOut: () => setCategoryHighlight(null),
        maxWidth: Math.max(0, legendLayout.legendInnerWidth - 43),
      });
    }
  }, [data, config, dimensions]);
}
