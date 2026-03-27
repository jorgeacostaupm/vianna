import * as d3 from "d3";
import { useEffect, useState } from "react";
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
import { CHART_OUTLINE_MUTED } from "@/utils/chartTheme";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

const DEFAULT_HISTOGRAM_OPACITY = 0.5;
const FOCUSED_HISTOGRAM_OPACITY = 1;

export default function useHistogram({ chartRef, legendRef, data, config }) {
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
  const [hide, setHide] = useState([]);
  const [hoverGroup, setHoverGroup] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  useEffect(() => {
    setHide([]);
    setHoverGroup(null);
    setSelectedGroups([]);
  }, [groupsKey]);

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;
    const {
      nPoints,
      showLegend,
      showGrid,
      showGroupCountInLegend = true,
    } = config;
    const groupCounts = getGroupCounts(data, selectionGroups);
    const [xMin, xMax] = getNumericDomain(data);
    const pointEstimator = computeEstimator(nPoints, xMin, xMax);
    const densities = getDensities(data, selectionGroups, pointEstimator);
    const yMax = getYMax(densities);

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
      .scaleLinear()
      .domain([xMin, xMax])
      .range([0, chartWidth])
      .nice();
    const y = d3.scaleLinear().range([chartHeight, 0]).domain([0, yMax]).nice();

    const safePoints = Math.max(1, Number(nPoints) || 1);
    const bandwidth = (x(xMax) - x(xMin)) / safePoints;
    const binWidth = (xMax - xMin) / safePoints;

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

    const yAxisG = chart.append("g").call(d3.axisLeft(y).ticks(5));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    if (showGrid && yGridG) {
      attachTickLabelGridHover({
        axisGroup: yAxisG,
        gridGroup: yGridG,
      });
    }

    const histogramLayer = chart.append("g").attr("class", "histogram-layer");

    histogramLayer
      .selectAll(".density")
      .data(densities)
      .join("g")
      .attr("class", "density")
      .attr("data-group", (d) => d.group)
      .attr("opacity", DEFAULT_HISTOGRAM_OPACITY)
      .classed("hide", (d) => hide.includes(d.group))
      .each(function (d) {
        d3.select(this)
          .selectAll("rect")
          .data(d.value)
          .join("rect")
          .attr("class", "histogram-bar")
          .attr("x", (bin) => x(bin[0]))
          .attr("y", (bin) => y(bin[1]))
          .attr("width", bandwidth)
          .attr("height", (bin) => chartHeight - y(bin[1]))
          .attr("fill", color(d.group))
          .attr("stroke", CHART_OUTLINE_MUTED)
          .attr("stroke-width", 0.8)
          .on("mouseover", function (e, item) {
            tooltip.style("visibility", "visible").html(`
              <strong>${d.group}</strong> <br/>
              <strong>n = ${groupCounts.get(d.group) || 0}</strong><br/>
              ${item[0].toFixed(2)} to ${(item[0] + binWidth).toFixed(2)} <br/>
              nº items: ${item[1]}
              `);
          })
          .on("mousemove", function (e) {
            moveTooltip(e, tooltip, chart);
          })
          .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
          });
      });

    const focusGroupInFront = (group) => {
      if (!group) return;
      histogramLayer
        .selectAll(".density")
        .filter((d) => d.group === group)
        .raise();

      if (showGrid && yGridG) {
        paintLayersInOrder({
          chartGroup: chart,
          layers: [xAxisG, yAxisG, yGridG],
        });
      }
    };

    if (showLegend !== false) {
      renderLegend(legend, selectionGroups, color, {
        hide,
        setHide,
        getCircleOpacity: (group) =>
          getHistogramOpacity(group, selectedGroups, hoverGroup),
        labelByGroup: showGroupCountInLegend
          ? (group) => formatGroupCountLabel(group, groupCounts)
          : undefined,
        onHoverGroupChange: (group) => setHoverGroup(group),
        onCircleClick: (group) => {
          setSelectedGroups((prev) =>
            prev.includes(group)
              ? prev.filter((g) => g !== group)
              : [...prev, group],
          );
          setHoverGroup(null);
          focusGroupInFront(group);
        },
      });
    }

    if (showGrid && yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }
  }, [data, config, dimensions, groupsKey, colorDomain]);

  useEffect(() => {
    if (!chartRef.current || !legendRef.current) return;

    const chart = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    chart
      .selectAll(".density")
      .classed("hide", (d) => hide.includes(d.group))
      .attr("opacity", (d) => getHistogramOpacity(d.group, selectedGroups, hoverGroup));

    legend
      .selectAll(".legend-item")
      .attr("opacity", function () {
        const group = d3.select(this).attr("data-group");
        return getHistogramOpacity(group, selectedGroups, hoverGroup);
      });

    legend
      .selectAll(".legend-circle")
      .attr("opacity", function () {
        const group = d3.select(this).attr("data-group");
        return getHistogramOpacity(group, selectedGroups, hoverGroup);
      });

    const groupsToFront = [...selectedGroups];
    if (hoverGroup && !groupsToFront.includes(hoverGroup)) {
      groupsToFront.push(hoverGroup);
    }

    if (groupsToFront.length) {
      const histogramLayer = chart.select(".histogram-layer");
      groupsToFront.forEach((group) => {
        histogramLayer
          .selectAll(".density")
          .filter((d) => d.group === group)
          .raise();
      });
    }
  }, [hide, hoverGroup, selectedGroups, chartRef, legendRef]);
}

function getHistogramOpacity(group, selectedGroups, hoverGroup) {
  const isSelected = selectedGroups.includes(group);
  const isHovered = hoverGroup === group;
  return isSelected || isHovered
    ? FOCUSED_HISTOGRAM_OPACITY
    : DEFAULT_HISTOGRAM_OPACITY;
}

function getNumericDomain(data) {
  const values = (data || [])
    .map((d) => +d.value)
    .filter((value) => Number.isFinite(value));

  if (!values.length) return [0, 1];

  const [xMin, xMax] = d3.extent(values);
  if (xMin === xMax) {
    const pad = Math.abs(xMin) * 0.5 || 0.5;
    return [xMin - pad, xMax + pad];
  }

  return [xMin, xMax];
}

function computeEstimator(numPoints, min, max) {
  return function histogramDensity(array) {
    const safePoints = Math.max(1, Number(numPoints) || 1);
    const span = max - min;
    const binWidth = span > 0 ? span / safePoints : 1;
    const bins = Array(safePoints).fill(0);

    array.forEach((value) => {
      if (value >= min && value <= max) {
        let binIndex = Math.floor((value - min) / binWidth);
        binIndex = Math.min(binIndex, safePoints - 1);
        bins[binIndex]++;
      }
    });

    const histogram = bins.map((count, i) => {
      const binCenter = min + binWidth * i;
      return [Number(binCenter), count];
    });

    return histogram;
  };
}

function getDensities(data, selectionGroups, pointEstimator) {
  const densities = selectionGroups.map((group) => {
    const values = data
      .filter(function (d) {
        return d.type === group;
      })
      .map(function (d) {
        return +d.value;
      });
    const density = pointEstimator(values);
    return { value: density, group: group };
  });

  return densities;
}

function getYMax(densities) {
  return Math.max(
    ...densities
      .map((d) => d.value)
      .flat()
      .map((d) => d[1])
  );
}
