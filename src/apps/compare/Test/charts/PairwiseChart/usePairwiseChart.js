import * as d3 from "d3";
import { getChartTooltip } from "@/utils/chartTooltip";
import { useEffect } from "react";

import useResizeObserver from "@/hooks/useResizeObserver";
import { formatDecimal, moveTooltip } from "@/utils/functions";
import { CHART_GRID, CHART_OUTLINE } from "@/utils/chartTheme";
import { attachTickLabelGridHover, paintLayersInOrder } from "@/utils/gridInteractions";

export default function usePairwiseChart({ containerRef, id, data: result, config }) {
  const dimensions = useResizeObserver(containerRef);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    if (!dimensions || !result?.pairwiseEffects?.length) {
      return;
    }

    const {
      showCaps,
      capSize,
      markerShape,
      markerSize,
      positiveOnly,
      sortDescending,
      yAxisLabelSpace,
    } = config;

    let data = result.pairwiseEffects.map((item) => ({
      ...item,
      groups: [...item.groups],
      ci95: { ...item.ci95 },
    }));

    if (positiveOnly) {
      data = data.map((item) => {
        if (item.value < 0) {
          return {
            ...item,
            value: -item.value,
            groups: [...item.groups].reverse(),
            ci95: { lower: -item.ci95.upper, upper: -item.ci95.lower },
          };
        }
        return item;
      });
    }

    data.sort((a, b) => (sortDescending ? b.value - a.value : a.value - b.value));

    const labels = data.map((item) => item.groups.join(" vs "));

    const leftMargin = Number.isFinite(yAxisLabelSpace)
      ? Math.max(100, Math.min(320, yAxisLabelSpace))
      : 160;
    const margin = { top: 20, right: 50, bottom: 50, left: leftMargin };
    const totalWidth = dimensions.width;
    const totalHeight = dimensions.height;
    const chartWidth = totalWidth - margin.left - margin.right;
    const chartHeight = totalHeight - margin.top - margin.bottom;

    const tooltip = getChartTooltip();

    const svg = container
      .append("svg")
      .attr("id", id)
      .attr("width", "100%")
      .attr("height", "100%")
      .style("display", "block");

    if (totalHeight > chartHeight + margin.top + margin.bottom) {
      svg.style("position", "absolute").style("bottom", 0).style("left", 0);
    }

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .style("font-size", "var(--axis-label-font-size, 16px)");

    const rawLower = Math.min(d3.min(data, (item) => item.ci95.lower), 0);
    const rawUpper = d3.max(data, (item) => item.ci95.upper);
    const x = d3.scaleLinear().domain([rawLower, rawUpper]).nice().range([0, chartWidth]);
    const y = d3.scaleBand().domain(labels).range([0, chartHeight]).padding(0.2);

    const yAxisG = chart.append("g").call(d3.axisLeft(y));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();
    yAxisG.selectAll("text").each(function () {
      const textElement = d3.select(this);
      const fullText = textElement.text();

      if (this.getComputedTextLength() > margin.left - 20) {
        let truncated = fullText;
        while (this.getComputedTextLength() > margin.left - 20 && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
          textElement.text(`${truncated}…`);
        }
        textElement.append("title").text(fullText);
      }
    });

    const xAxisG = chart
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(5));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();

    const xGridG = chart
      .append("g")
      .attr("class", "grid x-grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-chartHeight).tickFormat(""));
    xGridG.select(".domain").remove();
    xGridG.selectAll(".tick line").attr("stroke", CHART_GRID);

    const formatPValueLines = (item) => {
      const adjustedLabel = item?.pAdjustMethod
        ? `p-value (${item.pAdjustMethod}): ${formatDecimal(item.pValue)}`
        : `p-value: ${formatDecimal(item.pValue)}`;

      const rawLine =
        item?.pAdjustMethod && Number.isFinite(item?.pValueRaw)
          ? `<br/>raw p-value: ${formatDecimal(item.pValueRaw)}`
          : "";

      return `${adjustedLabel}${rawLine}`;
    };

    chart
      .selectAll(".effect-bar")
      .data(data)
      .join("line")
      .attr("class", "effect-bar")
      .attr("stroke", CHART_OUTLINE)
      .attr("stroke-width", 1.8)
      .attr("x1", (item) => x(item.ci95.lower))
      .attr("x2", (item) => x(item.ci95.upper))
      .attr("y1", (_, index) => y(labels[index]) + y.bandwidth() / 2)
      .attr("y2", (_, index) => y(labels[index]) + y.bandwidth() / 2)
      .on("mouseover", (event, item) => {
        tooltip
          .html(
            `<strong>${item.groups.join(" vs ")}</strong><br/>${item.measure}: ${item.value.toFixed(2)}<br/>CI: [${item.ci95.lower.toFixed(2)}, ${item.ci95.upper.toFixed(2)}]<br/>${formatPValueLines(item)}`,
          )
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    if (showCaps) {
      chart
        .selectAll(".cap-left")
        .data(data)
        .join("line")
        .attr("class", "cap-left")
        .attr("stroke", CHART_OUTLINE)
        .attr("stroke-width", 1.6)
        .attr("x1", (item) => x(item.ci95.lower))
        .attr("x2", (item) => x(item.ci95.lower))
        .attr("y1", (_, index) => y(labels[index]) + y.bandwidth() / 2 - capSize)
        .attr("y2", (_, index) => y(labels[index]) + y.bandwidth() / 2 + capSize);

      chart
        .selectAll(".cap-right")
        .data(data)
        .join("line")
        .attr("class", "cap-right")
        .attr("stroke", CHART_OUTLINE)
        .attr("stroke-width", 1.6)
        .attr("x1", (item) => x(item.ci95.upper))
        .attr("x2", (item) => x(item.ci95.upper))
        .attr("y1", (_, index) => y(labels[index]) + y.bandwidth() / 2 - capSize)
        .attr("y2", (_, index) => y(labels[index]) + y.bandwidth() / 2 + capSize);
    }

    if (markerShape === "circle") {
      chart
        .selectAll(".effect-point")
        .data(data)
        .join("circle")
        .attr("class", "effect-point")
        .attr("cx", (item) => x(item.value))
        .attr("cy", (_, index) => y(labels[index]) + y.bandwidth() / 2)
        .attr("r", markerSize);
    } else {
      const symbolType = markerShape === "square" ? d3.symbolSquare : d3.symbolDiamond;
      const symbol = d3.symbol().type(symbolType).size(markerSize * markerSize * 4);

      chart
        .selectAll(".effect-point")
        .data(data)
        .join("path")
        .attr("class", "effect-point")
        .attr("d", symbol)
        .attr(
          "transform",
          (_, index) => `translate(${x(data[index].value)},${y(labels[index]) + y.bandwidth() / 2})`,
        );
    }

    chart
      .selectAll(".effect-point")
      .attr("fill", "var(--primary-color)")
      .on("mouseover", (event, item) => {
        tooltip
          .html(
            `<strong>${item.groups.join(" vs ")}</strong><br/>${item.measure}: ${item.value.toFixed(2)}<br/>CI: [${item.ci95.lower.toFixed(2)}, ${item.ci95.upper.toFixed(2)}]<br/>${formatPValueLines(item)}`,
          )
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
      .on("mouseout", () => tooltip.style("visibility", "hidden"));

    attachTickLabelGridHover({
      axisGroup: xAxisG,
      gridGroup: xGridG,
      lineSelector: "line",
      includeTick: () => true,
    });

    paintLayersInOrder({
      chartGroup: chart,
      layers: [xAxisG, yAxisG, xGridG],
    });
  }, [containerRef, dimensions, id, result, config]);
}
