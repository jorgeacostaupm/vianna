import * as d3 from "d3";
import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";

import { moveTooltip } from "@/utils/functions";
import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { numMargin } from "@/apps/compare/Numeric/charts/Density/useDensity";
import { CHART_OUTLINE } from "@/utils/chartTheme";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

export default function useLineChart({ chartRef, legendRef, data, config }) {
  const dimensions = useResizeObserver(chartRef);
  const groupVar = useSelector((s) => s.evolution.groupVar);
  const {
    showMeans,
    showOverallMean,
    showStds,
    showObs,
    showCIs,
    showLmmFit,
    showLmmCI,
    showLegend,
    showGrid,
    meanPointSize,
    meanStrokeWidth,
    subjectPointSize,
    subjectStrokeWidth,
  } = config || {};
  const visibleGroups = [];
  if (showMeans) {
    visibleGroups.push(...(data?.meanData || []).map((entry) => entry.group));
  }
  if (showObs) {
    visibleGroups.push(
      ...(data?.participantData || []).map((entry) => entry.group),
    );
  }
  if (showLmmFit || showLmmCI) {
    visibleGroups.push(
      ...(data?.lmm?.predictions || []).map((entry) => entry.group),
    );
  }
  if (showOverallMean && data?.overallMeanData?.values?.length) {
    visibleGroups.push(data.overallMeanData.group ?? "All");
  }

  const rawGroups = Array.from(new Set(visibleGroups)).filter(
    (value) => value != null,
  );
  const { colorDomain, orderedGroups: groups } = useGroupColorDomain(
    groupVar,
    rawGroups,
  );
  const selectionGroups = groups;
  const selectionTimestamps = (data?.times || []).map((t) => `${t}`);
  const [hide, setHide] = useState([]);

  const chartStateRef = useRef({
    svg: null,
    chart: null,
    color: null,
    x: null,
    y: null,
  });

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;

    const chartWidth = width - numMargin.left - numMargin.right;
    const chartHeight = height - numMargin.top - numMargin.bottom;

    const [yMin, yMax] = getYRange(
      data.participantData,
      data.meanData,
      data.overallMeanData,
      data.lmm?.predictions,
      showMeans,
      showOverallMean,
      showStds,
      showObs,
      showCIs,
      showLmmFit,
      showLmmCI
    );

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${numMargin.left},${numMargin.top})`);

    const color = d3
      .scaleOrdinal()
      .domain(colorDomain)
      .range(d3.schemeCategory10);

    const x = d3
      .scaleBand()
      .domain(selectionTimestamps)
      .range([0, chartWidth])
      .padding(0.2);
    const y = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([chartHeight, 0])
      .nice(5);

    let yGridG = null;
    if (showGrid) {
      yGridG = chart
        .append("g")
        .attr("class", "grid y-grid")
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-chartWidth)
            .tickFormat("")
        )
        .call((g) => g.select(".domain").remove());
    }

    const xAxisG = chart
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll(".tick line").remove();

    const yAxisG = chart
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5));
    yAxisG.select(".domain").remove();
    yAxisG.selectAll(".tick line").remove();

    if (showGrid && yGridG) {
      attachTickLabelGridHover({
        axisGroup: yAxisG,
        gridGroup: yGridG,
      });
    }

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    }

    chartStateRef.current = {
      svg,
      chart,
      color,
      x,
      y,
      chartWidth,
      chartHeight,
      tooltip,
    };

    function renderParticipants() {
      if (!data.participantData) return;

      const evolutions = chart
        .selectAll(".evolution")
        .data(data.participantData, (d) => d.id)
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "evolution");
            g.append("path")
              .attr("class", "evolution-line")
              .attr("fill", "none");
            g.append("g").attr("class", "evolution-points");
            return g;
          },
          (update) => update,
          (exit) => exit.remove()
        )
        .classed("hide", (d) => hide.includes(d.group));

      const idLine = d3
        .line()
        .defined((p) => Number.isFinite(+p.value))
        .x((p) => x("" + p.timestamp) + x.bandwidth() / 2)
        .y((p) => y(+p.value));

      evolutions.each(function (participant) {
        const g = d3.select(this);
        const grpColor = color(participant.group);

        g.select(".evolution-line")
          .datum(participant.values)
          .attr("d", idLine)
          .attr("stroke", grpColor)
          .attr("stroke-width", subjectStrokeWidth)
          .attr("fill", "none");

        const pts = g
          .select(".evolution-points")
          .selectAll("circle")
          .data(
            participant.values,
            (d, i) => participant.id + "-" + d.timestamp + "-" + i
          )
          .join(
            (enter) => enter.append("circle").attr("class", "obs-point"),
            (update) => update,
            (exit) => exit.remove()
          );

        pts
          .attr("cx", (d) => x("" + d.timestamp) + x.bandwidth() / 2)
          .attr("cy", (d) => y(d.value))
          .attr("fill", grpColor)
          .attr("stroke", CHART_OUTLINE)
          .attr("r", subjectPointSize)
          .on("mouseover", function (event, d) {
            const html = `
              <strong>${participant.id} (${participant.group})</strong><br/>
              ${d.timestamp} : ${d.value}
            `;
            tooltip.style("opacity", 1).html(html);
          })
          .on("mousemove", function (e) {
            moveTooltip(e, tooltip, chart);
          })
          .on("mouseout", function () {
            tooltip.style("opacity", 0);
          });
      });
    }

    function renderMeans() {
      if (!data.meanData) return;

      const line = d3
        .line()
        .defined((p) => Number.isFinite(+p.value.mean))
        .x((d) => x(d.time) + x.bandwidth() / 2)
        .y((d) => y(+d.value.mean));

      if (showStds) {
        const area = d3
          .area()
          .defined(
            (p) =>
              Number.isFinite(+p.value.mean) && Number.isFinite(+p.value.std)
          )
          .x((d) => x(d.time) + x.bandwidth() / 2)
          .y0((d) => y(+d.value.mean - +d.value.std))
          .y1((d) => y(+d.value.mean + +d.value.std))
          .curve(d3.curveMonotoneX);

        const bands = chart
          .selectAll(".evolutionStd")
          .data(data.meanData, (d) => d.group)
          .join("g")
          .attr("class", "evolutionStd")
          .classed("hide", (d) => hide.includes(d.group));

        bands
          .append("path")
          .attr("d", (d) => area(d.values))
          .attr("fill", (d) => color(d.group))
          .attr("opacity", 0.2);
      }

      if (showCIs) {
        const barWidth = x.bandwidth() * 0.1;

        data.meanData.forEach((groupData) => {
          const g = chart
            .append("g")
            .attr("class", "evolutionCI")
            .datum(groupData);

          groupData.values.forEach((v) => {
            g.append("line")
              .attr("x1", x(v.time) + x.bandwidth() / 2)
              .attr("x2", x(v.time) + x.bandwidth() / 2)
              .attr("y1", y(v.value.ci95.lower))
              .attr("y2", y(v.value.ci95.upper))
              .attr("stroke", color(groupData.group))
              .attr("stroke-width", 2);

            g.append("line")
              .attr("x1", x(v.time) + x.bandwidth() / 2 - barWidth / 2)
              .attr("x2", x(v.time) + x.bandwidth() / 2 + barWidth / 2)
              .attr("y1", y(v.value.ci95.upper))
              .attr("y2", y(v.value.ci95.upper))
              .attr("stroke", color(groupData.group))
              .attr("stroke-width", 2);

            g.append("line")
              .attr("x1", x(v.time) + x.bandwidth() / 2 - barWidth / 2)
              .attr("x2", x(v.time) + x.bandwidth() / 2 + barWidth / 2)
              .attr("y1", y(v.value.ci95.lower))
              .attr("y2", y(v.value.ci95.lower))
              .attr("stroke", color(groupData.group))
              .attr("stroke-width", 2);
          });
        });
      }

      const means = chart
        .selectAll(".evolutionMean")
        .data(data.meanData, (d) => d.group)
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "evolutionMean");
            g.append("path")
              .attr("class", "evolutionMeanLine")
              .attr("fill", "none");

            g.append("g").attr("class", "means");

            return g;
          },
          (update) => update,
          (exit) => exit.remove()
        )
        .classed("hide", (d) => hide.includes(d.group));

      means.each(function (d) {
        const g = d3.select(this);
        const c = color(d.group);

        g.select(".evolutionMeanLine")
          .datum(d.values)
          .attr("d", line)
          .attr("stroke", c)
          .attr("stroke-width", meanStrokeWidth)
          .attr("fill", "none");

        const meanPoints = g
          .select(".means")
          .selectAll("circle.mean")
          .data(d.values, (v) => d.group + "-" + v.time)
          .join("circle")
          .attr("class", "mean");

        meanPoints
          .attr("cx", (v) => x(v.time) + x.bandwidth() / 2)
          .attr("cy", (v) => y(v.value.mean))
          .attr("fill", c)
          .attr("stroke", CHART_OUTLINE)
          .attr("r", meanPointSize)
          .on("mouseover", function (event, v) {
            const html = `
              <strong>${d.group}</strong><br/>
              ${v.time}<br/>
              Mean: ${Number(v.value.mean).toFixed(2)}<br/>
              Std: ${Number(v.value.std).toFixed(2)}
            `;
            tooltip.style("opacity", 1).html(html);
          })
          .on("mousemove", function (e) {
            moveTooltip(e, tooltip, chart);
          })
          .on("mouseout", function () {
            tooltip.style("opacity", 0);
          });
      });
    }

    function renderOverallMean() {
      const overall = data?.overallMeanData;
      if (!showOverallMean || !overall?.values?.length) return;

      const overallGroup = overall.group ?? "All";
      const overallColor = color(overallGroup);
      const line = d3
        .line()
        .defined((point) => Number.isFinite(+point.value?.mean))
        .x((point) => x(point.time) + x.bandwidth() / 2)
        .y((point) => y(+point.value.mean));

      const overallSelection = chart
        .selectAll(".evolutionOverallMean")
        .data([overall], () => "overall-mean")
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "evolutionOverallMean");
            g.append("path")
              .attr("class", "evolutionOverallMeanLine")
              .attr("fill", "none");
            g.append("g").attr("class", "overall-means");
            return g;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .classed("hide", (entry) => hide.includes(entry.group));

      overallSelection
        .select(".evolutionOverallMeanLine")
        .datum(overall.values)
        .attr("d", line)
        .attr("stroke", overallColor)
        .attr("stroke-width", meanStrokeWidth)
        .attr("fill", "none");

      const overallPoints = overallSelection
        .select(".overall-means")
        .selectAll("circle.overall-mean")
        .data(overall.values, (value) => `overall-${value.time}`)
        .join("circle")
        .attr("class", "overall-mean");

      overallPoints
        .attr("cx", (value) => x(value.time) + x.bandwidth() / 2)
        .attr("cy", (value) => y(+value.value.mean))
        .attr("fill", overallColor)
        .attr("stroke", CHART_OUTLINE)
        .attr("r", Math.max(meanPointSize, 4))
        .on("mouseover", function (event, value) {
          const html = `
            <strong>All groups</strong><br/>
            ${value.time}<br/>
            Mean: ${Number(value.value.mean).toFixed(2)}<br/>
            Std: ${Number(value.value.std).toFixed(2)}<br/>
            n: ${value.value.count}
          `;
          tooltip.style("opacity", 1).html(html);
        })
        .on("mousemove", function (e) {
          moveTooltip(e, tooltip, chart);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
        });

      if (!showCIs) {
        chart.selectAll(".evolutionOverallCI").remove();
        return;
      }

      const barWidth = x.bandwidth() * 0.12;
      const overallCI = chart
        .selectAll(".evolutionOverallCI")
        .data([overall], () => "overall-ci")
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "evolutionOverallCI");
            g.append("g").attr("class", "overall-ci-lines");
            return g;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .classed("hide", (entry) => hide.includes(entry.group));

      const ciLines = [];
      overall.values.forEach((value) => {
        const centerX = x(value.time) + x.bandwidth() / 2;
        ciLines.push({
          key: `${value.time}-v`,
          x1: centerX,
          x2: centerX,
          y1: y(value.value.ci95.lower),
          y2: y(value.value.ci95.upper),
        });
        ciLines.push({
          key: `${value.time}-top`,
          x1: centerX - barWidth / 2,
          x2: centerX + barWidth / 2,
          y1: y(value.value.ci95.upper),
          y2: y(value.value.ci95.upper),
        });
        ciLines.push({
          key: `${value.time}-bottom`,
          x1: centerX - barWidth / 2,
          x2: centerX + barWidth / 2,
          y1: y(value.value.ci95.lower),
          y2: y(value.value.ci95.lower),
        });
      });

      overallCI
        .select(".overall-ci-lines")
        .selectAll("line")
        .data(ciLines, (d) => d.key)
        .join("line")
        .attr("x1", (d) => d.x1)
        .attr("x2", (d) => d.x2)
        .attr("y1", (d) => d.y1)
        .attr("y2", (d) => d.y2)
        .attr("stroke", overallColor)
        .attr("stroke-width", 2);
    }

    function renderLmm() {
      const predictions = data?.lmm?.predictions;
      if (!Array.isArray(predictions) || !predictions.length) return;
      const timeEffect = data?.lmm?.wald?.time;
      const slope = Number(timeEffect?.estimate);
      const pValue = Number(timeEffect?.pValue);
      const slopeDirection = Number.isFinite(slope)
        ? slope > 0
          ? "positive"
          : slope < 0
            ? "negative"
            : "flat"
        : "unknown";
      const formatSlope = (value, digits = 4) =>
        Number.isFinite(value) ? value.toFixed(digits) : "—";
      const formatP = (value) => {
        if (!Number.isFinite(value)) return "—";
        if (value < 0.001) return "< 0.001";
        return value.toFixed(3);
      };

      const line = d3
        .line()
        .defined((point) => Number.isFinite(+point.fit))
        .x((point) => x(point.time) + x.bandwidth() / 2)
        .y((point) => y(+point.fit))
        .curve(d3.curveMonotoneX);

      if (showLmmCI) {
        const area = d3
          .area()
          .defined(
            (point) =>
              Number.isFinite(+point?.ci95?.lower) &&
              Number.isFinite(+point?.ci95?.upper),
          )
          .x((point) => x(point.time) + x.bandwidth() / 2)
          .y0((point) => y(+point.ci95.lower))
          .y1((point) => y(+point.ci95.upper))
          .curve(d3.curveMonotoneX);

        const ciBands = chart
          .selectAll(".evolutionLmmCI")
          .data(predictions, (entry) => entry.group)
          .join(
            (enter) => {
              const g = enter.append("g").attr("class", "evolutionLmmCI");
              g.append("path").attr("class", "evolutionLmmCIBand");
              return g;
            },
            (update) => update,
            (exit) => exit.remove(),
          )
          .classed("hide", (entry) => hide.includes(entry.group));

        ciBands
          .select(".evolutionLmmCIBand")
          .attr("d", (entry) => area(entry.values))
          .attr("fill", (entry) => color(entry.group))
          .attr("opacity", 0.12);
      }

      if (!showLmmFit) return;

      const lmmLines = chart
        .selectAll(".evolutionLmm")
        .data(predictions, (entry) => entry.group)
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "evolutionLmm");
            g.append("path")
              .attr("class", "evolutionLmmLine")
              .attr("fill", "none");
            return g;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .classed("hide", (entry) => hide.includes(entry.group));

      lmmLines.each(function (entry) {
        const validValues = (entry.values || []).filter((point) =>
          Number.isFinite(+point.fit),
        );
        const first = validValues.length ? validValues[0] : null;
        const last = validValues.length ? validValues[validValues.length - 1] : null;
        const delta =
          first && last ? Number(last.fit) - Number(first.fit) : Number.NaN;
        const trendLabel =
          Number.isFinite(delta) && delta !== 0
            ? delta > 0
              ? "upward"
              : "downward"
            : "flat";
        const groupLabel = entry.group ?? "All";

        d3.select(this)
          .select(".evolutionLmmLine")
          .datum(entry.values)
          .attr("d", line)
          .attr("stroke", color(entry.group))
          .attr("stroke-width", Math.max(2, meanStrokeWidth - 1))
          .attr("stroke-dasharray", "10 6")
          .attr("fill", "none")
          .on("mouseover", function () {
            const html = `
              <strong>${groupLabel}</strong><br/>
              LMM fit<br/>
              Reference: ${data?.lmm?.selectedGroup ?? "All"}<br/>
              Slope (time): ${formatSlope(slope)} (${slopeDirection})<br/>
              Wald p: ${formatP(pValue)}<br/>
              Δ first→last: ${formatSlope(delta, 3)} (${trendLabel})
            `;
            tooltip.style("opacity", 1).html(html);
          })
          .on("mousemove", function (e) {
            moveTooltip(e, tooltip, chart);
          })
          .on("mouseout", function () {
            tooltip.style("opacity", 0);
          });
      });
    }

    if (showObs) renderParticipants();
    if (showMeans) renderMeans();
    renderOverallMean();
    if (showLmmFit || showLmmCI) renderLmm();

    const inactiveOpacity = 0.12;
    const setGroupHighlight = (activeGroup = null) => {
      const hasActiveGroup = activeGroup !== null;
      const resolveOpacity = (d) => {
        if (!hasActiveGroup) return 1;
        return d?.group === activeGroup ? 1 : inactiveOpacity;
      };

      chart.selectAll(".evolution").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionMean").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionStd").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionCI").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionLmm").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionLmmCI").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionOverallMean").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionOverallCI").attr("opacity", resolveOpacity);

      legend.selectAll(".legend-item").attr("opacity", (d) => {
        if (!hasActiveGroup) return 1;
        return d === activeGroup ? 1 : inactiveOpacity;
      });
    };

    // legend
    if (showLegend !== false) {
      renderLineLegend(legend, selectionGroups, color, hide, setHide, {
        onItemMouseOver: setGroupHighlight,
        onItemMouseOut: () => setGroupHighlight(null),
      });
    }

    if (showGrid && yGridG) {
      paintLayersInOrder({
        chartGroup: chart,
        layers: [xAxisG, yAxisG, yGridG],
      });
    }

    chartStateRef.current = {
      svg,
      chart,
      color,
      x,
      y,
      chartWidth,
      chartHeight,
      tooltip,
    };

    return () => {
      d3.select(chartRef.current).selectAll("*").remove();
      d3.select(legendRef.current).selectAll("*").remove();
      chartStateRef.current = {};
    };
  }, [
    data,
    dimensions,
    selectionTimestamps.join("|"),
    showCIs,
    showOverallMean,
    showLmmCI,
    showLmmFit,
    showObs,
    showMeans,
    showStds,
    showLegend,
    showGrid,
    colorDomain,
  ]);

  useEffect(() => {
    if (!chartStateRef.current.chart) return;
    const { chart } = chartStateRef.current;

    const {
      meanPointSize,
      subjectPointSize,
      meanStrokeWidth,
      subjectStrokeWidth,
    } = config || {};

    if (meanPointSize != null)
      chart.selectAll("circle.mean").attr("r", meanPointSize);
    if (meanPointSize != null)
      chart
        .selectAll("circle.overall-mean")
        .attr("r", Math.max(meanPointSize, 4));
    if (subjectPointSize != null)
      chart.selectAll("circle.obs-point").attr("r", subjectPointSize);
    if (meanStrokeWidth != null)
      chart
        .selectAll(".evolutionMeanLine")
        .attr("stroke-width", meanStrokeWidth);
    if (meanStrokeWidth != null)
      chart
        .selectAll(".evolutionLmmLine")
        .attr("stroke-width", Math.max(2, meanStrokeWidth - 1));
    if (subjectStrokeWidth != null)
      chart
        .selectAll(".evolution-line")
        .attr("stroke-width", subjectStrokeWidth);
  }, [meanPointSize, subjectPointSize, meanStrokeWidth, subjectStrokeWidth]);

  useEffect(() => {
    if (!chartStateRef.current.chart) return;
    const { chart } = chartStateRef.current;

    chart
      .selectAll(".evolutionStd")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionCI")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionLmm")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionLmmCI")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionOverallMean")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionOverallCI")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolutionMean")
      .classed("hide", (d) => hide.includes(d.group));

    chart
      .selectAll(".evolution")
      .classed("hide", (d) => hide.includes(d.group));
  }, [hide]);
}

function getYRange(
  participantData = [],
  meanData = [],
  overallMeanData = null,
  lmmPredictions = [],
  showMeans,
  showOverallMean,
  showStds,
  showObs,
  showCIs,
  showLmmFit,
  showLmmCI
) {
  const vals = [];

  // Valores individuales
  if (showObs && participantData) {
    participantData.forEach((p) =>
      p.values.forEach((v) => {
        const n = +v.value;
        if (Number.isFinite(n)) vals.push(n);
      })
    );
  }

  // Valores de media
  if (showMeans && meanData) {
    meanData.forEach((g) =>
      g.values.forEach((v) => {
        const m = +v.value.mean;
        if (Number.isFinite(m)) vals.push(m);

        // Añadir std si corresponde
        if (showStds) {
          const s = +v.value.std;
          if (Number.isFinite(s)) {
            vals.push(m + s);
            vals.push(m - s);
          }
        }

        // Añadir IC si corresponde
        if (showCIs && v.value.ci95) {
          const lower = +v.value.ci95.lower;
          const upper = +v.value.ci95.upper;
          if (Number.isFinite(lower)) vals.push(lower);
          if (Number.isFinite(upper)) vals.push(upper);
        }
      })
    );
  }

  if (showOverallMean && overallMeanData?.values) {
    overallMeanData.values.forEach((value) => {
      const mean = +value.value.mean;
      if (Number.isFinite(mean)) vals.push(mean);

      if (showCIs && value.value.ci95) {
        const lower = +value.value.ci95.lower;
        const upper = +value.value.ci95.upper;
        if (Number.isFinite(lower)) vals.push(lower);
        if (Number.isFinite(upper)) vals.push(upper);
      }
    });
  }

  if ((showLmmFit || showLmmCI) && Array.isArray(lmmPredictions)) {
    lmmPredictions.forEach((group) =>
      (group.values || []).forEach((v) => {
        const fit = +v.fit;
        if (showLmmFit && Number.isFinite(fit)) vals.push(fit);

        if (showLmmCI && v.ci95) {
          const lower = +v.ci95.lower;
          const upper = +v.ci95.upper;
          if (Number.isFinite(lower)) vals.push(lower);
          if (Number.isFinite(upper)) vals.push(upper);
        }
      })
    );
  }

  if (vals.length === 0) return [0, 1];
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  const pad = (max - min) * 0.01 || 1;
  return [min - pad, max + pad];
}

function renderLineLegend(
  legend,
  groups,
  color,
  hide,
  setHide,
  { onItemMouseOver, onItemMouseOut } = {}
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
      .attr("transform", `translate(0,${y})`)
      .datum(group)
      .on("mouseover", () => onItemMouseOver?.(group))
      .on("mouseout", () => onItemMouseOut?.())
      .on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        setHide((prev) => {
          const isHidden = prev.includes(group);
          const next = isHidden
            ? prev.filter((g) => g !== group)
            : [...prev, group];

          legendItem.select(".legend-label").classed("cross", !isHidden);
          return next;
        });
      });

    legendItem
      .append("circle")
      .attr("class", "legend-circle")
      .attr("cx", circleSize + 10)
      .attr("cy", 0)
      .attr("r", circleSize)
      .style("fill", color(group));

    legendItem
      .append("text")
      .attr("class", "legend-label")
      .classed("cross", hide.includes(group))
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
    .attr("height", bbox.y + bbox.height);
}
