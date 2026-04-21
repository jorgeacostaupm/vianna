import * as d3 from "d3";
import jstat from "jstat";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { notifyInfo } from "@/components/notifications";
import { moveTooltip } from "@/utils/functions";
import { CHART_OUTLINE } from "@/utils/chartTheme";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

export const numMargin = { top: 50, right: 50, bottom: 50, left: 90 };
const DEFAULT_DISTRIBUTION_OPACITY = 0.5;
const FOCUSED_DISTRIBUTION_OPACITY = 1;

export default function useDensity({ chartRef, legendRef, data, config }) {
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
      useCustomRange,
      range,
      margin,
      showLegend,
      showGrid,
      showGroupCountInLegend = true,
      scaleDensityStrokeByGroupSize = true,
    } = config;
    const [xMin, xMax] = getNumericDomain(data, {
      margin,
      useCustomRange,
      range,
    });
    const groupCounts = getGroupCounts(data, selectionGroups);
    const strokeWidthByGroup = scaleDensityStrokeByGroupSize
      ? createGroupSizeScale(groupCounts, {
        min: 1,
        max: 2.2,
      })
      : () => 1;
    const groupedValues = d3.group(data, (d) => d.type);
    const pointEstimator = computeEstimator(nPoints, xMin, xMax);
    const densities = getDensities(data, selectionGroups, pointEstimator);
    const yMax = getYMax(densities);

    d3.select(chartRef.current).selectAll("*").remove();
    d3.select(legendRef.current).selectAll("*").remove();

    const chartWidth = width - numMargin.left - numMargin.right;
    const chartHeight = height - numMargin.top - numMargin.bottom;

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);
    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    const chart = svg
      .append("g")
      .attr("transform", `translate(${numMargin.left},${numMargin.top})`);

    const color = d3
      .scaleOrdinal()
      .domain(colorDomain)
      .range(GROUP_CATEGORICAL_PALETTE);
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, chartWidth]);
    const y = d3.scaleLinear().range([chartHeight, 0]).domain([0, yMax]);
    const densityArea = d3
      .area()
      .x((point) => x(point[0]))
      .y0(() => y(0))
      .y1((point) => y(point[1]))
      .curve(d3.curveMonotoneX);

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

    const densityLayer = chart.append("g").attr("class", "density-layer");

    densityLayer
      .selectAll(".density")
      .data(densities)
      .join("path")
      .attr("class", "density")
      .attr("data-group", (d) => d.group)
      .attr("fill", (d) => color(d.group))
      .attr("stroke-width", (d) => strokeWidthByGroup(d.group))
      .attr("opacity", DEFAULT_DISTRIBUTION_OPACITY)
      .classed("hide", (d) => hide.includes(d.group))
      .attr("d", (d) => densityArea(d.value))
      .on("mouseover", function (e, d) {
        showStats(d.group);
        const values = (groupedValues.get(d.group) || []).map((pt) => +pt.value);
        if (values.length) {
          tooltip
            .style("visibility", "visible")
            .style("opacity", 1)
            .html(
              `
              <strong>${d.group}</strong><br/>
              <strong>n = ${values.length}</strong><br/>
              Min: ${d3.min(values).toFixed(2)}<br/>
              Mean: ${d3.mean(values).toFixed(2)}<br/>
              Max: ${d3.max(values).toFixed(2)}
            `,
            );
        }
      })
      .on("mousemove", function (e) {
        moveTooltip(e, tooltip, chart);
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        hideStats();
      });

    const focusGroupInFront = (group) => {
      if (!group) return;
      densityLayer
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
      renderLegend(
        legend,
        selectionGroups,
        color,
        {
          hide,
          setHide,
          showStats,
          hideStats,
          getCircleOpacity: (group) =>
            getDistributionOpacity(group, selectedGroups, hoverGroup),
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
        },
      );
    }

    if (showGrid && yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }

    function hideStats() {
      chart.selectAll(".stat-line").remove();
      chart.selectAll(".stat-label").remove();
    }

    function showStats(group) {
      const vals = (groupedValues.get(group) || []).map((pt) => +pt.value);
      if (!vals.length) return;

      const mean = jstat.mean(vals);
      const std = jstat.stdev(vals);

      const stats = [
        ["µ", mean],
        ["–σ", mean - std],
        ["+σ", mean + std],
      ];

      stats.forEach(([label, val], i) => {
        chart
          .append("line")
          .attr("class", `stat-line stat-line--${i}`)
          .attr("x1", x(val))
          .attr("x2", x(val))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .attr("stroke", CHART_OUTLINE)
          .attr("stroke-dasharray", i === 0 ? null : "2,2")
          .attr("stroke-width", 1);

        if (label === "µ") {
          chart
            .append("text")
            .attr("class", `stat-label stat-label--${i}`)
            .attr("x", x(val))
            .attr("y", -10)
            .style("font-weight", "bold")
            .attr("text-anchor", "end")
            .text(`${label}: ${val.toFixed(2)}`);

          chart
            .append("text")
            .attr("class", `stat-label stat-label--${i}`)
            .attr("x", x(val) + 5)
            .attr("y", -10)
            .style("font-weight", "bold")
            .attr("text-anchor", "start")
            .text(`${"σ"}: ${std.toFixed(2)}`);
        } else {
          chart
            .append("text")
            .attr("class", `stat-label stat-label--${i}`)
            .attr("x", label === "–σ" ? x(val) - 5 : x(val) + 5)
            .attr("y", chartHeight * 0.1)
            .attr("text-anchor", label === "–σ" ? "end" : "start")
            .text(`${label}: ${val.toFixed(2)}`);
        }
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
      .attr("opacity", (d) =>
        getDistributionOpacity(d.group, selectedGroups, hoverGroup),
      );

    legend
      .selectAll(".legend-item")
      .attr("opacity", function () {
        const group = d3.select(this).attr("data-group");
        return getDistributionOpacity(group, selectedGroups, hoverGroup);
      });

    legend
      .selectAll(".legend-circle")
      .attr("opacity", function () {
        const group = d3.select(this).attr("data-group");
        return getDistributionOpacity(group, selectedGroups, hoverGroup);
      });

    const groupsToFront = [...selectedGroups];
    if (hoverGroup && !groupsToFront.includes(hoverGroup)) {
      groupsToFront.push(hoverGroup);
    }

    if (groupsToFront.length) {
      const densityLayer = chart.select(".density-layer");
      groupsToFront.forEach((group) => {
        densityLayer
          .selectAll(".density")
          .filter((d) => d.group === group)
          .raise();
      });
    }
  }, [hide, hoverGroup, selectedGroups, chartRef, legendRef]);
}

function getDistributionOpacity(group, selectedGroups, hoverGroup) {
  const isSelected = selectedGroups.includes(group);
  const isHovered = hoverGroup === group;
  return isSelected || isHovered
    ? FOCUSED_DISTRIBUTION_OPACITY
    : DEFAULT_DISTRIBUTION_OPACITY;
}

export function getNumericDomain(
  data,
  {
    margin = 0.05,
    range = [0, 1],
    useCustomRange = false,
    accessor = (d) => +d.value,
  } = {},
) {
  const normalizedRange = normalizeRange(range);

  if (!data || data.length === 0) {
    return normalizedRange;
  }

  const { min, max } = data.reduce(
    (acc, d) => {
      const value = accessor(d);
      if (Number.isFinite(value)) {
        if (value < acc.min) acc.min = value;
        if (value > acc.max) acc.max = value;
      }
      return acc;
    },
    { min: Infinity, max: -Infinity },
  );

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return normalizedRange;
  }

  const rangeV = max - min || 1;
  const plotMargin = margin * rangeV;

  return useCustomRange
    ? normalizedRange
    : [min - plotMargin, max + plotMargin];
}

function normalizeRange(range) {
  const input = Array.isArray(range) ? range : [0, 1];
  const a = Number(input[0]);
  const b = Number(input[1]);
  const safeA = Number.isFinite(a) ? a : 0;
  const safeB = Number.isFinite(b) ? b : 1;
  if (safeA === safeB) {
    return [safeA - 0.5, safeB + 0.5];
  }
  return safeA < safeB ? [safeA, safeB] : [safeB, safeA];
}

export function computeEstimator(numPoints, min, max) {
  return function gaussianDensity(data, group) {
    data.sort((a, b) => a - b);
    const std = jstat.stdev(data);

    if (std === 0) {
      const uniformValue = data[0];
      notifyInfo({
        message: `Group ${group} has a Uniform Distribution`,
        description: `Uniform Value: ${uniformValue}`,
        pauseOnHover: true,
      });

      return Array.from({ length: numPoints }, () => [uniformValue, 1]);
    }

    const n = data.length;
    let bandwidth = 1.06 * std * Math.pow(n, -0.2);

    const step = (max - min) / (numPoints - 1);
    const xValues = Array.from({ length: numPoints }, (_, i) => min + i * step);

    const tmp = xValues.map((x) => {
      const kernelEstimate = data.reduce((sum, xi) => {
        return sum + gaussianKernel((x - xi) / bandwidth);
      }, 0);
      return [x, kernelEstimate / (data.length * bandwidth)];
    });

    return tmp;
  };
}

function gaussianKernel(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function getDensities(data, selectionGroups, pointEstimator) {
  const densities = selectionGroups.map((group) => {
    const values = data
      .filter(function (d) {
        return d.type === group;
      })
      .map(function (d) {
        return +d.value;
      });
    const density = pointEstimator(values, group);
    return { value: density, group: group, n: values.length };
  });

  return densities;
}

export function getYMax(densities) {
  return Math.max(
    ...densities
      .map((d) => d.value)
      .flat()
      .map((d) => d[1]),
  );
}

export function renderLegend(
  legend,
  groups,
  color,
  {
    blur,
    setBlur,
    hide,
    setHide,
    showStats,
    hideStats,
    getCircleOpacity,
    labelByGroup,
    onHoverGroupChange,
    onCircleClick,
  } = {},
) {
  const circleSize = 10;
  const padding = 6;
  const lineHeight = circleSize * 2 + padding;

  const legendGroup = legend
    .append("g")
    .attr("class", "legend-group")
    .style("cursor", "pointer");

  const orderedGroups = Array.isArray(groups) ? [...groups] : [];

  orderedGroups.forEach((group, i) => {
    const y = i * lineHeight + circleSize * 2;

    const legendItem = legendGroup
      .append("g")
      .attr("class", "legend-item")
      .attr("data-group", group)
      .attr(
        "opacity",
        getCircleOpacity ? getCircleOpacity(group) : 1,
      )
      .attr("transform", `translate(0,${y})`);

    const circles = legendItem
      .append("circle")
      .attr("class", "legend-circle")
      .attr("data-group", group)
      .attr("cx", circleSize + 10)
      .attr("cy", 0)
      .attr("r", circleSize)
      .attr(
        "opacity",
        getCircleOpacity ? getCircleOpacity(group) : 1,
      )
      .style("fill", color(group));

    if (blur && setBlur) {
      circles.classed("blur", blur.includes(group)).on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = d3.select(e.currentTarget);
        const isInactive = item.classed("blur");

        setBlur((prev) =>
          isInactive ? prev.filter((g) => g !== group) : [...prev, group],
        );
        item.classed("blur", !isInactive);

        // Click has priority over transient hover preview.
        if (onHoverGroupChange) onHoverGroupChange(null);

        // Notify as an activation toggle: true => opacity 1, false => back to low opacity.
        if (onCircleClick) onCircleClick(group, isInactive);
      });
    } else if (onCircleClick) {
      circles.on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onCircleClick(group);
      });
    }

    const labels = legendItem
      .append("text")
      .attr("class", "legend-label")

      .attr("x", circleSize * 2 + 15)
      .attr("y", 4)
      .datum(group)
      .text(labelByGroup ? labelByGroup(group) : group);

    if (hide && setHide) {
      labels.classed("cross", hide.includes(group)).on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sel = d3.select(e.currentTarget);
        const isHide = sel.classed("cross");

        setHide((prev) =>
          prev.includes(group)
            ? prev.filter((g) => g !== group)
            : [...prev, group],
        );

        if (!isHide && hideStats) hideStats();

        sel.classed("cross", !isHide);
      });
    }

    if (onHoverGroupChange || showStats || hideStats) {
      // Hover is a transient focus preview; persistent visibility is click-only.
      legendItem
        .on("mouseenter", () => {
          if (onHoverGroupChange) onHoverGroupChange(group);
          if (showStats) showStats(group);
        })
        .on("mouseleave", () => {
          if (onHoverGroupChange) onHoverGroupChange(null);
          if (hideStats) hideStats();
        });
    }
  });

  const bbox = legendGroup.node().getBBox();

  const parent = legend.node().parentNode;
  const { height } = parent.getBoundingClientRect();

  if (height > bbox.y + bbox.height) {
    d3.select(parent).style("align-items", "center");
  } else {
    d3.select(parent).style("align-items", null);
  }

  legend
    .attr("width", bbox.x + bbox.width)
    .attr("height", bbox.y + bbox.height);
}

export function getGroupCounts(data, groups) {
  const groupCounts = new Map((groups || []).map((group) => [group, 0]));

  (data || []).forEach((row) => {
    if (groupCounts.has(row.type)) {
      groupCounts.set(row.type, groupCounts.get(row.type) + 1);
    }
  });

  return groupCounts;
}

export function formatGroupCountLabel(group, groupCounts) {
  const n = groupCounts.get(group) || 0;
  return `${group} (n=${n})`;
}

function createGroupSizeScale(
  groupCounts,
  { min = 0.55, max = 1, scaleType = "sqrt" } = {},
) {
  const values = Array.from(groupCounts.values()).filter((n) => n > 0);
  if (values.length === 0) {
    return () => max;
  }

  const [countMin, countMax] = d3.extent(values);
  if (countMin === countMax) {
    return () => max;
  }

  const scaleFactory = scaleType === "linear" ? d3.scaleLinear : d3.scaleSqrt;
  const scale = scaleFactory().domain([countMin, countMax]).range([min, max]);
  return (group) => {
    const n = groupCounts.get(group);
    if (!Number.isFinite(n) || n <= 0) return min;
    return scale(n);
  };
}
