import * as d3 from "d3";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { moveTooltip } from "@/utils/functions";
import renderLegend from "@/utils/renderLegend";
import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { CHART_HIGHLIGHT } from "@/utils/chartTheme";
import { ORDER_VARIABLE } from "@/utils/Constants";

const margin = { top: 30, right: 20, bottom: 40, left: 60 };

export default function usePCAPlot({ chartRef, legendRef, data, config, grouping }) {
  const dimensions = useResizeObserver(chartRef);
  const idVar = useSelector((s) => s.main.idVar);
  const [hiddenGroups, setHiddenGroups] = useState([]);
  const [hoverHiddenGroups, setHoverHiddenGroups] = useState([]);
  const { groupVar, pointSize, pointOpacity, showLegend } = config;
  const groupsInData =
    Array.isArray(data) && groupVar
      ? Array.from(new Set(data.map((d) => d[groupVar]))).filter(
          (value) => value != null
        )
      : [];
  const { colorDomain, orderedGroups: groups } = useGroupColorDomain(
    groupVar,
    groupsInData
  );

  useEffect(() => {
    const clearChart = () => {
      if (!chartRef.current) return;
      d3.select(chartRef.current).selectAll("*").remove();
    };
    const clearLegend = () => {
      if (!legendRef.current) return;
      const legendSvg = d3.select(legendRef.current);
      legendSvg.selectAll("*").remove();
      legendSvg.attr("width", 0).attr("height", 0);
      const parent = legendRef.current.parentNode;
      if (parent) {
        d3.select(parent).style("align-items", null).style("justify-content", null);
      }
    };

    if (!dimensions || !data || !chartRef.current || !legendRef.current) {
      clearChart();
      clearLegend();
      return;
    }
    if (!groupVar) {
      clearChart();
      clearLegend();
      return;
    }
    if (data.length === 0) {
      clearChart();
      clearLegend();
      return;
    }

    clearChart();
    clearLegend();

    const colorScheme = d3.schemeCategory10;

    const totalWidth = dimensions.width;
    const totalHeight = dimensions.height;
    const chartAreaWidth = totalWidth;
    const chartWidth = chartAreaWidth - margin.left - margin.right;
    const chartHeight = totalHeight - margin.top - margin.bottom;
    const chartSize = Math.min(chartWidth, chartHeight);

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    const xExtent = d3.extent(data, (d) => d.pc1);
    const yExtent = d3.extent(data, (d) => d.pc2);

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .nice()
      .range([0, chartSize]);
    const yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .nice()
      .range([chartSize, 0]);

    const color = d3.scaleOrdinal().domain(colorDomain).range(colorScheme);

    const xAxisGroup = chart
      .append("g")
      .attr("transform", `translate(0,${chartSize})`)
      .call(d3.axisBottom(xScale));

    const yAxisGroup = chart.append("g").call(d3.axisLeft(yScale));

    const plotClipId = `pca-clip-${Math.random().toString(36).slice(2, 10)}`;
    chart
      .append("defs")
      .append("clipPath")
      .attr("id", plotClipId)
      .append("rect")
      .attr("width", chartSize)
      .attr("height", chartSize);

    const dotsLayer = chart
      .append("g")
      .attr("class", "pca-dots-layer")
      .attr("clip-path", `url(#${plotClipId})`);

    let activeXScale = xScale.copy();
    let activeYScale = yScale.copy();

    const dots = dotsLayer
      .selectAll(".dot")
      .data(data)
      .join("circle")
      .attr("class", "dot")
      .attr("r", pointSize)
      .attr("fill", (d) => color(d[groupVar]))
      .attr("opacity", pointOpacity ?? 0.7)
      .style("cursor", grouping?.enabled ? "pointer" : null)
      .on("mouseover", (e, d) => {
        const target = e.target;
        d3.select(target).style("stroke", CHART_HIGHLIGHT).raise();

        let html = `<strong>${d[groupVar]}</strong> <br>`;
        html += `Var 1: ${d.pc1.toFixed(2)}<br> Var 2: ${d.pc2.toFixed(2)} `;
        html += d[idVar] ? `<br>${idVar}: ${d[idVar]}` : "";

        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", (e) => moveTooltip(e, tooltip, chart))
      .on("mouseout", (e) => {
        d3.select(e.target).style("stroke", null);
        tooltip.style("opacity", 0);
      })
      .on("click", (e, d) => {
        if (!grouping?.enabled || typeof grouping?.onPointToggle !== "function") {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const orderValue = d?.[ORDER_VARIABLE];
        if (orderValue == null) return;

        grouping.onPointToggle(orderValue);
      });

    const updatePointPositions = () => {
      dots
        .attr("cx", (d) => activeXScale(d.pc1))
        .attr("cy", (d) => activeYScale(d.pc2));
    };

    updatePointPositions();

    if (showLegend !== false) {
      renderLegend(
        legend,
        groups,
        color,
        null,
        null,
        hiddenGroups,
        setHiddenGroups,
        null,
        null,
        {
          transientHide: hoverHiddenGroups,
          setTransientHide: setHoverHiddenGroups,
        }
      );
    }

    let isLassoActive = false;
    let lassoPoints = [];

    const lassoPath = chart
      .append("path")
      .attr("class", "pca-lasso-path")
      .attr("fill", "rgba(16, 185, 129, 0.12)")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 1.5)
      .style("display", "none")
      .style("pointer-events", "none");

    const clampPoint = ([x, y]) => [
      Math.max(0, Math.min(chartSize, x)),
      Math.max(0, Math.min(chartSize, y)),
    ];

    const drawLassoPath = () => {
      if (!lassoPoints.length) {
        lassoPath.style("display", "none");
        return;
      }

      const start = lassoPoints[0];
      const body = lassoPoints.slice(1).map((p) => `L${p[0]},${p[1]}`).join(" ");
      lassoPath
        .style("display", null)
        .attr("d", `M${start[0]},${start[1]} ${body}`.trim());
    };

    const finishLasso = (event) => {
      if (!isLassoActive) return;

      if (lassoPoints.length >= 3 && grouping?.enabled) {
        const polygon = [...lassoPoints];
        const selectedOrderValues = data
          .filter((d) => {
            const orderValue = d?.[ORDER_VARIABLE];
            if (orderValue == null) return false;

            return d3.polygonContains(polygon, [
              activeXScale(d.pc1),
              activeYScale(d.pc2),
            ]);
          })
          .map((d) => d[ORDER_VARIABLE]);

        if (selectedOrderValues.length > 0) {
          grouping?.onLassoSelection?.(selectedOrderValues, grouping?.selectionMode);
        }
      }

      isLassoActive = false;
      lassoPoints = [];
      lassoPath.style("display", "none").attr("d", null);

      if (event?.preventDefault) {
        event.preventDefault();
      }
    };

    const onMouseDown = (event) => {
      if (!grouping?.enabled || !grouping?.activeGroupId) return;
      if (event.button !== 2) return;

      const pointer = clampPoint(d3.pointer(event, chart.node()));
      isLassoActive = true;
      lassoPoints = [pointer];
      drawLassoPath();
      event.preventDefault();
      event.stopPropagation();
    };

    const onMouseMove = (event) => {
      if (!isLassoActive) return;

      const pointer = clampPoint(d3.pointer(event, chart.node()));
      lassoPoints.push(pointer);
      drawLassoPath();
      event.preventDefault();
    };

    const onMouseUp = (event) => {
      finishLasso(event);
    };

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.5, 40])
      .filter((event) => {
        if (event.type === "mousedown") return event.button === 0;
        if (event.type === "wheel") return true;
        if (event.type === "dblclick") return true;
        return false;
      })
      .on("zoom", (event) => {
        const transform = event.transform;
        activeXScale = transform.rescaleX(xScale);
        activeYScale = transform.rescaleY(yScale);
        xAxisGroup.call(d3.axisBottom(activeXScale));
        yAxisGroup.call(d3.axisLeft(activeYScale));
        updatePointPositions();
      });

    svg.call(zoomBehavior);
    svg.on("contextmenu.pca-lasso", (event) => {
      if (!grouping?.enabled) return;
      event.preventDefault();
    });

    svg.on("mousedown.pca-lasso", onMouseDown);
    svg.on("mousemove.pca-lasso", onMouseMove);
    svg.on("mouseup.pca-lasso", onMouseUp);
    svg.on("mouseleave.pca-lasso", onMouseUp);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      svg.on(".zoom", null);
      svg.on(".pca-lasso", null);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    data,
    config,
    dimensions,
    colorDomain,
    groups,
    grouping?.enabled,
    grouping?.activeGroupId,
    grouping?.selectionMode,
    grouping?.onLassoSelection,
    grouping?.onPointToggle,
  ]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = d3.select(chartRef.current);

    const assignments = grouping?.assignments || {};
    const activeGroupId = grouping?.activeGroupId || null;
    const hiddenSet = new Set([...(hiddenGroups || []), ...(hoverHiddenGroups || [])]);

    chart
      .selectAll(".dot")
      .classed("hide", (d) => hiddenSet.has(d[groupVar]))
      .classed(
        "lasso-assigned",
        (d) => assignments[d?.[ORDER_VARIABLE]] !== undefined
      )
      .classed(
        "lasso-active",
        (d) => assignments[d?.[ORDER_VARIABLE]] === activeGroupId
      )
      .classed("lasso-other", (d) => {
        const groupId = assignments[d?.[ORDER_VARIABLE]];
        return groupId !== undefined && groupId !== activeGroupId;
      });
  }, [
    hiddenGroups,
    hoverHiddenGroups,
    groupVar,
    grouping?.assignments,
    grouping?.activeGroupId,
  ]);

  useEffect(() => {
    setHiddenGroups([]);
    setHoverHiddenGroups([]);
  }, [groupVar]);
}
