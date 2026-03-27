import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
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
    showGridBehindAll,
    forceDiscreteAggregatedMode,
    ratioNodeScale,
    ratioEdgeScale,
    ratioNodeMinPx,
    ratioNodeMaxPx,
    ratioEdgeMinPx,
    ratioEdgeMaxPx,
    meanPointSize,
    meanAsBoxplot,
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
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [selectedNodesByVisit, setSelectedNodesByVisit] = useState({});
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const visibleParticipantGroups = useMemo(() => {
    const source = Array.isArray(data?.participantData)
      ? data.participantData
      : [];
    const hiddenSet = new Set((hide || []).map((entry) => String(entry)));
    return Array.from(
      new Set(
        source
          .map((entry) => entry?.group)
          .filter((group) => group != null && !hiddenSet.has(String(group)))
          .map((group) => String(group)),
      ),
    );
  }, [data?.participantData, hide]);

  const activeSingleEvolutionId = useMemo(
    () => detectSingleActiveEvolution(visibleParticipantGroups),
    [visibleParticipantGroups],
  );
  const isSingleEvolutionMode = Boolean(activeSingleEvolutionId);

  const activeEvolutionSubjects = useMemo(() => {
    if (!isSingleEvolutionMode || !Array.isArray(data?.participantData))
      return [];
    return data.participantData.filter(
      (subject) => String(subject?.group) === String(activeSingleEvolutionId),
    );
  }, [data?.participantData, activeSingleEvolutionId, isSingleEvolutionMode]);

  const isDiscreteLowCardinalityMode = useMemo(
    () =>
      detectDiscreteLowCardinality(
        activeEvolutionSubjects,
        selectionTimestamps,
        10,
      ),
    [activeEvolutionSubjects, selectionTimestamps.join("|")],
  );

  const isDiscreteAggregatedMode =
    isSingleEvolutionMode &&
    (isDiscreteLowCardinalityMode || Boolean(forceDiscreteAggregatedMode));

  const compatibleSubjects = useMemo(
    () =>
      computeCompatibleSubjects(selectedNodesByVisit, activeEvolutionSubjects),
    [selectedNodesByVisit, activeEvolutionSubjects],
  );

  const discreteAggregates = useMemo(() => {
    if (!isDiscreteAggregatedMode) return null;

    const nodes = buildAggregatedNodes(
      activeEvolutionSubjects,
      selectionTimestamps,
    );
    const edges = buildAggregatedEdges(
      activeEvolutionSubjects,
      selectionTimestamps,
    );
    const nodeTotals = computeNodeTotals(nodes);
    const nodeCompatibleCounts = computeNodeCompatibleCounts(
      nodes,
      compatibleSubjects,
    );
    const edgeTotals = computeEdgeTotals(edges);
    const edgeCompatibleCounts = computeEdgeCompatibleCounts(
      edges,
      compatibleSubjects,
    );

    return {
      nodes,
      edges,
      nodeTotals,
      nodeCompatibleCounts,
      edgeTotals,
      edgeCompatibleCounts,
      compatibleSubjects,
    };
  }, [
    isDiscreteAggregatedMode,
    activeEvolutionSubjects,
    selectionTimestamps.join("|"),
    compatibleSubjects,
  ]);

  const chartStateRef = useRef({
    svg: null,
    chart: null,
    color: null,
    x: null,
    y: null,
  });

  useEffect(() => {
    const validGroups = new Set(rawGroups.map((group) => String(group)));
    setHide((prev) => prev.filter((group) => validGroups.has(String(group))));
  }, [rawGroups.join("|")]);

  useEffect(() => {
    const validSubjectIds = new Set(
      (data?.participantData || []).map((entry) => String(entry?.id)),
    );
    setSelectedSubjectIds((prev) =>
      prev.filter((subjectId) => validSubjectIds.has(String(subjectId))),
    );
  }, [data?.participantData]);

  useEffect(() => {
    if (!isDiscreteAggregatedMode) return;
    setSelectedSubjectIds([]);
  }, [isDiscreteAggregatedMode]);

  useEffect(() => {
    if (isDiscreteAggregatedMode) return;
    setSelectedNodesByVisit(clearSelectedNodes());
    setHoveredNode(null);
    setHoveredEdge(null);
  }, [isDiscreteAggregatedMode, activeSingleEvolutionId]);

  useEffect(() => {
    if (!dimensions || !data || !chartRef.current || !legendRef.current) return;

    const { width, height } = dimensions;

    const chartWidth = width - numMargin.left - numMargin.right;
    const chartHeight = height - numMargin.top - numMargin.bottom;
    const hiddenGroupSet = new Set((hide || []).map((group) => String(group)));

    const [yMin, yMax] = isDiscreteAggregatedMode
      ? getDiscreteYRange(activeEvolutionSubjects)
      : getYRange(
          data.participantData,
          data.meanData,
          data.overallMeanData,
          data.lmm?.predictions,
          showMeans,
          showOverallMean,
          showStds,
          meanAsBoxplot,
          showObs,
          showCIs,
          showLmmFit,
          showLmmCI,
          hiddenGroupSet,
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
        .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(""))
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

    const normalizedMeanPointSize = Number.isFinite(+meanPointSize)
      ? +meanPointSize
      : 4;
    const defaultDiscreteMeanRadius = getDiscreteDefaultMeanRadius(
      x.bandwidth(),
    );
    const meanPointRadius = isDiscreteAggregatedMode
      ? defaultDiscreteMeanRadius
      : normalizedMeanPointSize;
    const meanVisualRadius = isDiscreteAggregatedMode
      ? meanPointRadius
      : Math.max(normalizedMeanPointSize, 4);
    const meanLineDasharray = "8 16";
    const meanPointStroke = "black";
    const meanPointStrokeWidth = 2;
    const applyMeanLineStyle = (selection, strokeColor) =>
      selection
        .attr("stroke", strokeColor)
        .attr("stroke-width", meanStrokeWidth)
        .attr("stroke-dasharray", meanLineDasharray)
        .attr("fill", "none");
    const applyMeanPointStyle = (selection, fillColor) =>
      selection
        .attr("fill", fillColor)
        .attr("stroke", meanPointStroke)
        .attr("stroke-width", meanPointStrokeWidth)
        .attr("r", meanVisualRadius);

    function renderParticipants() {
      if (!data.participantData) return;
      const hoveredSubjectOpacity = 0.06;
      const selectedSet = new Set((selectedSubjectIds || []).map(String));

      const setHoveredSubjectHighlight = (
        activeSubjectId = null,
        activeGroup = null,
      ) => {
        const hasActiveSubject = activeSubjectId != null && activeGroup != null;
        const activeSubjectIds = new Set(selectedSet);
        if (hasActiveSubject) activeSubjectIds.add(String(activeSubjectId));
        const hasFocusSubjects = activeSubjectIds.size > 0;

        if (!hasFocusSubjects) {
          chart.selectAll(".evolution").attr("opacity", 1);
          chart.selectAll(".evolutionMean").attr("opacity", 1);
          chart.selectAll(".evolutionStd").attr("opacity", 1);
          chart.selectAll(".evolutionCI").attr("opacity", 1);
          chart.selectAll(".evolutionOverallMean").attr("opacity", 1);
          chart.selectAll(".evolutionOverallCI").attr("opacity", 1);
          chart.selectAll(".evolutionLmm").attr("opacity", 1);
          chart.selectAll(".evolutionLmmCI").attr("opacity", 1);
          chart
            .selectAll(".evolution .evolution-line")
            .attr("stroke-width", subjectStrokeWidth);
          chart
            .selectAll(".evolution .obs-point")
            .attr("r", subjectPointSize)
            .attr("stroke-width", 1.2);
          return;
        }

        const focusGroups = new Set(
          data.participantData
            .filter((subject) => activeSubjectIds.has(String(subject?.id)))
            .map((subject) => subject?.group),
        );
        const activeLineWidth = subjectStrokeWidth * 2;
        const activePointRadius = subjectPointSize * 2;

        chart
          .selectAll(".evolution")
          .attr("opacity", (entry) =>
            activeSubjectIds.has(String(entry?.id)) ? 1 : hoveredSubjectOpacity,
          );
        chart
          .selectAll(".evolutionMean")
          .attr("opacity", (entry) =>
            focusGroups.has(entry?.group) ? 1 : hoveredSubjectOpacity,
          );
        chart
          .selectAll(".evolutionStd")
          .attr("opacity", (entry) =>
            focusGroups.has(entry?.group) ? 1 : hoveredSubjectOpacity,
          );
        chart
          .selectAll(".evolutionCI")
          .attr("opacity", (entry) =>
            focusGroups.has(entry?.group) ? 1 : hoveredSubjectOpacity,
          );
        chart
          .selectAll(".evolutionOverallMean")
          .attr("opacity", hoveredSubjectOpacity);
        chart
          .selectAll(".evolutionOverallCI")
          .attr("opacity", hoveredSubjectOpacity);
        chart.selectAll(".evolutionLmm").attr("opacity", hoveredSubjectOpacity);
        chart
          .selectAll(".evolutionLmmCI")
          .attr("opacity", hoveredSubjectOpacity);
        chart.selectAll(".evolution").each(function (entry) {
          const isActive = activeSubjectIds.has(String(entry?.id));
          const g = d3.select(this);
          g.select(".evolution-line").attr(
            "stroke-width",
            isActive ? activeLineWidth : subjectStrokeWidth,
          );
          g.selectAll(".obs-point")
            .attr("r", isActive ? activePointRadius : subjectPointSize)
            .attr("stroke-width", isActive ? 2 : 0.8);
        });
        chart
          .selectAll(".evolution")
          .filter((entry) => activeSubjectIds.has(String(entry?.id)))
          .raise();
      };

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
          (exit) => exit.remove(),
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
            (d, i) => participant.id + "-" + d.timestamp + "-" + i,
          )
          .join(
            (enter) => enter.append("circle").attr("class", "obs-point"),
            (update) => update,
            (exit) => exit.remove(),
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

        g.on("mouseenter", function () {
          setHoveredSubjectHighlight(participant.id, participant.group);
        })
          .on("mouseleave", function () {
            setHoveredSubjectHighlight(null, null);
          })
          .on("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            setSelectedSubjectIds((prev) => {
              const targetId = String(participant.id);
              if (prev.includes(targetId)) {
                return prev.filter((subjectId) => subjectId !== targetId);
              }
              return [...prev, targetId];
            });
          });
      });

      setHoveredSubjectHighlight(null, null);
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
              Number.isFinite(+p.value.mean) && Number.isFinite(+p.value.std),
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

      if (showCIs && !meanAsBoxplot) {
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
          (exit) => exit.remove(),
        )
        .classed("hide", (d) => hide.includes(d.group));

      means.each(function (d) {
        const g = d3.select(this);
        const c = color(d.group);

        applyMeanLineStyle(
          g.select(".evolutionMeanLine").datum(d.values).attr("d", line),
          c,
        );

        const meansLayer = g.select(".means");
        if (meanAsBoxplot) {
          meansLayer.selectAll("circle.mean").remove();
          const markerWidth = Math.max(8, x.bandwidth() * 0.24);
          const halfCap = markerWidth * 0.35;
          const markers = meansLayer
            .selectAll("g.mean-marker")
            .data(d.values, (v) => d.group + "-" + v.time)
            .join((enter) => {
              const gm = enter.append("g").attr("class", "mean-marker");
              gm.append("line").attr("class", "mean-whisker");
              gm.append("line").attr("class", "mean-whisker-cap-top");
              gm.append("line").attr("class", "mean-whisker-cap-bottom");
              gm.append("rect").attr("class", "mean-box");
              gm.append("line").attr("class", "mean-median");
              return gm;
            });

          markers.each(function (v) {
            const centerX = x(v.time) + x.bandwidth() / 2;
            const mean = Number(v.value.mean);
            const std = Number(v.value.std);
            const ciLower = Number(v.value?.ci95?.lower);
            const ciUpper = Number(v.value?.ci95?.upper);
            const whiskerLow = Number.isFinite(ciLower)
              ? ciLower
              : Number.isFinite(std)
                ? mean - std
                : mean;
            const whiskerHigh = Number.isFinite(ciUpper)
              ? ciUpper
              : Number.isFinite(std)
                ? mean + std
                : mean;
            const spreadLow = Math.min(whiskerLow, whiskerHigh);
            const spreadHigh = Math.max(whiskerLow, whiskerHigh);
            const spread = Math.max(0, spreadHigh - spreadLow);
            const boxLow = Math.max(spreadLow, mean - spread * 0.25);
            const boxHigh = Math.min(spreadHigh, mean + spread * 0.25);

            const yWhiskerTop = y(Math.max(whiskerHigh, whiskerLow));
            const yWhiskerBottom = y(Math.min(whiskerHigh, whiskerLow));
            const yBoxTop = y(Math.max(boxHigh, boxLow));
            const yBoxBottom = y(Math.min(boxHigh, boxLow));
            const boxHeight = Math.max(2, yBoxBottom - yBoxTop);

            const gm = d3.select(this);
            gm.select(".mean-whisker")
              .attr("x1", centerX)
              .attr("x2", centerX)
              .attr("y1", yWhiskerTop)
              .attr("y2", yWhiskerBottom)
              .attr("stroke", c)
              .attr("stroke-width", 1.6);
            gm.select(".mean-whisker-cap-top")
              .attr("x1", centerX - halfCap)
              .attr("x2", centerX + halfCap)
              .attr("y1", yWhiskerTop)
              .attr("y2", yWhiskerTop)
              .attr("stroke", c)
              .attr("stroke-width", 1.6);
            gm.select(".mean-whisker-cap-bottom")
              .attr("x1", centerX - halfCap)
              .attr("x2", centerX + halfCap)
              .attr("y1", yWhiskerBottom)
              .attr("y2", yWhiskerBottom)
              .attr("stroke", c)
              .attr("stroke-width", 1.6);
            gm.select(".mean-box")
              .attr("x", centerX - markerWidth / 2)
              .attr("y", yBoxTop)
              .attr("width", markerWidth)
              .attr("height", boxHeight)
              .attr("fill", d3.color(c)?.copy({ opacity: 0.28 }) || c)
              .attr("stroke", c)
              .attr("stroke-width", 1.4);
            gm.select(".mean-median")
              .attr("x1", centerX - markerWidth / 2)
              .attr("x2", centerX + markerWidth / 2)
              .attr("y1", y(mean))
              .attr("y2", y(mean))
              .attr("stroke", "black")
              .attr("stroke-width", 2.4);
          });

          markers
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
        } else {
          meansLayer.selectAll("g.mean-marker").remove();
          const meanPoints = meansLayer
            .selectAll("circle.mean")
            .data(d.values, (v) => d.group + "-" + v.time)
            .join("circle")
            .attr("class", "mean");

          applyMeanPointStyle(
            meanPoints
              .attr("cx", (v) => x(v.time) + x.bandwidth() / 2)
              .attr("cy", (v) => y(v.value.mean)),
            c,
          )
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
        }
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
              .attr("class", "evolutionOverallMeanLine evolutionMeanLine")
              .attr("fill", "none");
            g.append("g").attr("class", "overall-means");
            return g;
          },
          (update) => update,
          (exit) => exit.remove(),
        )
        .classed("hide", (entry) => hide.includes(entry.group));

      applyMeanLineStyle(
        overallSelection
          .select(".evolutionOverallMeanLine")
          .datum(overall.values)
          .attr("d", line),
        overallColor,
      );

      const overallLayer = overallSelection.select(".overall-means");
      if (meanAsBoxplot) {
        overallLayer.selectAll("circle.overall-mean").remove();
        const markerWidth = Math.max(8, x.bandwidth() * 0.24);
        const halfCap = markerWidth * 0.35;
        const markers = overallLayer
          .selectAll("g.overall-mean-marker")
          .data(overall.values, (value) => `overall-${value.time}`)
          .join((enter) => {
            const gm = enter.append("g").attr("class", "overall-mean-marker");
            gm.append("line").attr("class", "mean-whisker");
            gm.append("line").attr("class", "mean-whisker-cap-top");
            gm.append("line").attr("class", "mean-whisker-cap-bottom");
            gm.append("rect").attr("class", "mean-box");
            gm.append("line").attr("class", "mean-median");
            return gm;
          });

        markers.each(function (value) {
          const centerX = x(value.time) + x.bandwidth() / 2;
          const mean = Number(value.value.mean);
          const std = Number(value.value.std);
          const ciLower = Number(value.value?.ci95?.lower);
          const ciUpper = Number(value.value?.ci95?.upper);
          const whiskerLow = Number.isFinite(ciLower)
            ? ciLower
            : Number.isFinite(std)
              ? mean - std
              : mean;
          const whiskerHigh = Number.isFinite(ciUpper)
            ? ciUpper
            : Number.isFinite(std)
              ? mean + std
              : mean;
          const spreadLow = Math.min(whiskerLow, whiskerHigh);
          const spreadHigh = Math.max(whiskerLow, whiskerHigh);
          const spread = Math.max(0, spreadHigh - spreadLow);
          const boxLow = Math.max(spreadLow, mean - spread * 0.25);
          const boxHigh = Math.min(spreadHigh, mean + spread * 0.25);

          const yWhiskerTop = y(Math.max(whiskerHigh, whiskerLow));
          const yWhiskerBottom = y(Math.min(whiskerHigh, whiskerLow));
          const yBoxTop = y(Math.max(boxHigh, boxLow));
          const yBoxBottom = y(Math.min(boxHigh, boxLow));
          const boxHeight = Math.max(2, yBoxBottom - yBoxTop);

          const gm = d3.select(this);
          gm.select(".mean-whisker")
            .attr("x1", centerX)
            .attr("x2", centerX)
            .attr("y1", yWhiskerTop)
            .attr("y2", yWhiskerBottom)
            .attr("stroke", overallColor)
            .attr("stroke-width", 1.6);
          gm.select(".mean-whisker-cap-top")
            .attr("x1", centerX - halfCap)
            .attr("x2", centerX + halfCap)
            .attr("y1", yWhiskerTop)
            .attr("y2", yWhiskerTop)
            .attr("stroke", overallColor)
            .attr("stroke-width", 1.6);
          gm.select(".mean-whisker-cap-bottom")
            .attr("x1", centerX - halfCap)
            .attr("x2", centerX + halfCap)
            .attr("y1", yWhiskerBottom)
            .attr("y2", yWhiskerBottom)
            .attr("stroke", overallColor)
            .attr("stroke-width", 1.6);
          gm.select(".mean-box")
            .attr("x", centerX - markerWidth / 2)
            .attr("y", yBoxTop)
            .attr("width", markerWidth)
            .attr("height", boxHeight)
            .attr(
              "fill",
              d3.color(overallColor)?.copy({ opacity: 0.28 }) || overallColor,
            )
            .attr("stroke", overallColor)
            .attr("stroke-width", 1.4);
          gm.select(".mean-median")
            .attr("x1", centerX - markerWidth / 2)
            .attr("x2", centerX + markerWidth / 2)
            .attr("y1", y(mean))
            .attr("y2", y(mean))
            .attr("stroke", "black")
            .attr("stroke-width", 2.4);
        });

        markers
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
      } else {
        overallLayer.selectAll("g.overall-mean-marker").remove();
        const overallPoints = overallLayer
          .selectAll("circle.overall-mean")
          .data(overall.values, (value) => `overall-${value.time}`)
          .join("circle")
          .attr("class", "overall-mean mean");

        applyMeanPointStyle(
          overallPoints
            .attr("cx", (value) => x(value.time) + x.bandwidth() / 2)
            .attr("cy", (value) => y(+value.value.mean)),
          overallColor,
        )
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
      }

      if (!showCIs || meanAsBoxplot) {
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
        const last = validValues.length
          ? validValues[validValues.length - 1]
          : null;
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

    if (isDiscreteAggregatedMode) {
      if (showMeans) renderMeans();
      if (showOverallMean) renderOverallMean();

      renderDiscreteAggregated({
        chart,
        x,
        y,
        color,
        activeGroup: activeSingleEvolutionId,
        tooltip,
        discreteAggregates,
        selectedNodesByVisit,
        onToggleNodeSelection: (visit, value) =>
          setSelectedNodesByVisit((prev) =>
            toggleNodeSelection(prev, visit, value),
          ),
        onNodeHover: setHoveredNode,
        onEdgeHover: setHoveredEdge,
        hoveredEdge,
        ratioNodeScale,
        ratioEdgeScale,
        ratioNodeMinPx,
        ratioNodeMaxPx,
        ratioEdgeMinPx,
        ratioEdgeMaxPx,
      });

      // In discrete mode, clicking an X tick toggles all node values for that timestamp.
      xAxisG
        .selectAll(".tick")
        .style("cursor", "pointer")
        .on("click", function (event, tickValue) {
          event.preventDefault();
          event.stopPropagation();
          const visit = String(tickValue);
          const valuesAtVisit = (discreteAggregates?.nodes || [])
            .filter((node) => String(node.visit) === visit)
            .map((node) => valueToKey(node.value));

          if (!valuesAtVisit.length) return;

          setSelectedNodesByVisit((prev) =>
            toggleVisitSelection(prev, visit, valuesAtVisit),
          );
        });
    } else {
      if (showObs) renderParticipants();
      if (showMeans) renderMeans();
      renderOverallMean();
      if (showLmmFit || showLmmCI) renderLmm();
    }

    const inactiveOpacity = 0.12;
    const reorderByGroupHover = (activeGroup = null) => {
      const rankByGroup = new Map(
        selectionGroups.map((group, index) => [String(group), index]),
      );
      const rankFor = (group) =>
        rankByGroup.get(String(group)) ?? Number.MAX_SAFE_INTEGER;

      const applySort = (selector) => {
        chart.selectAll(selector).sort((a, b) => {
          const groupA = String(a?.group ?? "");
          const groupB = String(b?.group ?? "");
          if (activeGroup != null) {
            const isAActive = groupA === String(activeGroup);
            const isBActive = groupB === String(activeGroup);
            if (isAActive !== isBActive) return isAActive ? 1 : -1;
          }
          return rankFor(groupA) - rankFor(groupB);
        });
      };

      applySort(".evolution");
      applySort(".evolutionMean");
      applySort(".evolutionStd");
      applySort(".evolutionCI");
      applySort(".evolutionLmm");
      applySort(".evolutionLmmCI");
      applySort(".evolutionOverallMean");
      applySort(".evolutionOverallCI");

      if (isDiscreteAggregatedMode) {
        if (activeGroup != null) {
          chart
            .selectAll(".evolutionMean")
            .filter((entry) => String(entry?.group) === String(activeGroup))
            .raise();
        } else {
          chart.selectAll(".discrete-aggregated-edges").raise();
          chart.selectAll(".discrete-aggregated-nodes").raise();
        }
      }
    };

    const setGroupHighlight = (activeGroup = null) => {
      if (selectedSubjectIds.length > 0) return;
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

      reorderByGroupHover(activeGroup);
    };

    // legend
    if (showLegend !== false) {
      renderLineLegend(legend, selectionGroups, color, hide, setHide, {
        onItemMouseOver: setGroupHighlight,
        onItemMouseOut: () => setGroupHighlight(null),
        onCircleClick: (group) => {
          setHide((prev) => {
            const normalizedGroup = String(group);
            const currentVisible = selectionGroups
              .map((entry) => String(entry))
              .filter((entry) => !prev.includes(entry));

            if (
              currentVisible.length === 1 &&
              currentVisible[0] === normalizedGroup
            ) {
              return [];
            }

            return selectionGroups
              .map((entry) => String(entry))
              .filter((entry) => entry !== normalizedGroup);
          });
        },
        clearSelectionVisible:
          (isDiscreteAggregatedMode &&
            hasSelectedNodes(selectedNodesByVisit)) ||
          selectedSubjectIds.length > 0,
        onClearSelection: () => {
          setSelectedNodesByVisit(clearSelectedNodes());
          setSelectedSubjectIds([]);
        },
        showDiscreteAggregatedLegend: isDiscreteAggregatedMode,
        discreteLegendColor: color(activeSingleEvolutionId),
        discreteHasSelection:
          isDiscreteAggregatedMode && hasSelectedNodes(selectedNodesByVisit),
      });
    }

    if (showGrid && yGridG) {
      if (showGridBehindAll) {
        yGridG.lower();
      } else {
        paintLayersInOrder({
          chartGroup: chart,
          layers: [xAxisG, yAxisG, yGridG],
        });
      }
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
    meanAsBoxplot,
    showStds,
    showLegend,
    showGrid,
    showGridBehindAll,
    ratioNodeScale,
    ratioEdgeScale,
    ratioNodeMinPx,
    ratioNodeMaxPx,
    ratioEdgeMinPx,
    ratioEdgeMaxPx,
    colorDomain,
    hide.join("|"),
    activeSingleEvolutionId,
    isSingleEvolutionMode,
    isDiscreteLowCardinalityMode,
    isDiscreteAggregatedMode,
    discreteAggregates,
    activeEvolutionSubjects,
    selectedNodesByVisit,
    hoveredNode?.key,
    hoveredEdge?.key,
    selectedSubjectIds.join("|"),
  ]);

  useEffect(() => {
    if (!chartStateRef.current.chart) return;
    const { chart, x } = chartStateRef.current;

    const {
      meanPointSize,
      subjectPointSize,
      meanStrokeWidth,
      subjectStrokeWidth,
    } = config || {};

    const effectiveMeanRadius =
      isDiscreteAggregatedMode && x?.bandwidth
        ? getDiscreteDefaultMeanRadius(x.bandwidth())
        : Number.isFinite(+meanPointSize)
          ? +meanPointSize
          : 4;
    const effectiveMeanVisualRadius = isDiscreteAggregatedMode
      ? effectiveMeanRadius
      : Math.max(Number.isFinite(+meanPointSize) ? +meanPointSize : 4, 4);
    const meanPointStroke = "black";
    const meanPointStrokeWidth = 2;

    if (meanPointSize != null)
      chart
        .selectAll("circle.mean")
        .attr("r", effectiveMeanVisualRadius)
        .attr("stroke", meanPointStroke)
        .attr("stroke-width", meanPointStrokeWidth);
    if (meanPointSize != null)
      chart
        .selectAll("circle.overall-mean")
        .attr("r", effectiveMeanVisualRadius)
        .attr("stroke", meanPointStroke)
        .attr("stroke-width", meanPointStrokeWidth);
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
  }, [
    meanPointSize,
    meanAsBoxplot,
    subjectPointSize,
    meanStrokeWidth,
    subjectStrokeWidth,
    isDiscreteAggregatedMode,
  ]);

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
  meanAsBoxplot,
  showObs,
  showCIs,
  showLmmFit,
  showLmmCI,
  hiddenGroupSet = new Set(),
) {
  const vals = [];
  const isGroupVisible = (group) => !hiddenGroupSet.has(String(group));

  // Valores individuales
  if (showObs && participantData) {
    participantData.forEach((p) => {
      if (!isGroupVisible(p?.group)) return;
      p.values.forEach((v) => {
        const n = +v.value;
        if (Number.isFinite(n)) vals.push(n);
      });
    });
  }

  // Valores de media
  if (showMeans && meanData) {
    meanData.forEach((g) => {
      if (!isGroupVisible(g?.group)) return;
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

        if (meanAsBoxplot) {
          const s = +v.value.std;
          const lower = +v.value?.ci95?.lower;
          const upper = +v.value?.ci95?.upper;
          const whiskerLow = Number.isFinite(lower)
            ? lower
            : Number.isFinite(s)
              ? m - s
              : NaN;
          const whiskerHigh = Number.isFinite(upper)
            ? upper
            : Number.isFinite(s)
              ? m + s
              : NaN;
          if (Number.isFinite(whiskerLow)) vals.push(whiskerLow);
          if (Number.isFinite(whiskerHigh)) vals.push(whiskerHigh);
        }

        // Añadir IC si corresponde
        if (showCIs && v.value.ci95) {
          const lower = +v.value.ci95.lower;
          const upper = +v.value.ci95.upper;
          if (Number.isFinite(lower)) vals.push(lower);
          if (Number.isFinite(upper)) vals.push(upper);
        }
      });
    });
  }

  if (
    showOverallMean &&
    overallMeanData?.values &&
    isGroupVisible(overallMeanData?.group ?? "All")
  ) {
    overallMeanData.values.forEach((value) => {
      const mean = +value.value.mean;
      if (Number.isFinite(mean)) vals.push(mean);

      if (meanAsBoxplot) {
        const s = +value.value.std;
        const lower = +value.value?.ci95?.lower;
        const upper = +value.value?.ci95?.upper;
        const whiskerLow = Number.isFinite(lower)
          ? lower
          : Number.isFinite(s)
            ? mean - s
            : NaN;
        const whiskerHigh = Number.isFinite(upper)
          ? upper
          : Number.isFinite(s)
            ? mean + s
            : NaN;
        if (Number.isFinite(whiskerLow)) vals.push(whiskerLow);
        if (Number.isFinite(whiskerHigh)) vals.push(whiskerHigh);
      }

      if (showCIs && value.value.ci95) {
        const lower = +value.value.ci95.lower;
        const upper = +value.value.ci95.upper;
        if (Number.isFinite(lower)) vals.push(lower);
        if (Number.isFinite(upper)) vals.push(upper);
      }
    });
  }

  if ((showLmmFit || showLmmCI) && Array.isArray(lmmPredictions)) {
    lmmPredictions.forEach((group) => {
      if (!isGroupVisible(group?.group)) return;
      (group.values || []).forEach((v) => {
        const fit = +v.fit;
        if (showLmmFit && Number.isFinite(fit)) vals.push(fit);

        if (showLmmCI && v.ci95) {
          const lower = +v.ci95.lower;
          const upper = +v.ci95.upper;
          if (Number.isFinite(lower)) vals.push(lower);
          if (Number.isFinite(upper)) vals.push(upper);
        }
      });
    });
  }

  if (vals.length === 0) return [0, 1];
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  const pad = (max - min) * 0.01 || 1;
  return [min - pad, max + pad];
}

function valueToKey(value) {
  return String(value);
}

function buildNodeKey(visit, value) {
  return `${String(visit)}||${valueToKey(value)}`;
}

function buildEdgeKey(fromVisit, fromValue, toVisit, toValue) {
  return `${buildNodeKey(fromVisit, fromValue)}=>${buildNodeKey(toVisit, toValue)}`;
}

function detectDiscreteLowCardinality(
  subjects = [],
  visits = [],
  maxDistinct = 10,
) {
  if (!Array.isArray(subjects) || !subjects.length) return false;
  if (!Array.isArray(visits) || !visits.length) return false;

  for (const visit of visits) {
    const observed = new Set();
    subjects.forEach((subject) => {
      const point = (subject?.values || []).find(
        (entry) => String(entry?.timestamp) === String(visit),
      );
      const numeric = Number(point?.value);
      if (Number.isFinite(numeric)) {
        observed.add(valueToKey(numeric));
      }
    });
    if (observed.size === 0 || observed.size >= maxDistinct) {
      return false;
    }
  }

  return true;
}

function detectSingleActiveEvolution(visibleGroups = []) {
  if (!Array.isArray(visibleGroups) || visibleGroups.length !== 1) return null;
  return visibleGroups[0];
}

function buildAggregatedNodes(subjects = [], visits = []) {
  const rankByVisit = new Map(
    visits.map((visit, index) => [String(visit), index]),
  );
  const nodesByKey = new Map();

  subjects.forEach((subject) => {
    (subject?.values || []).forEach((entry) => {
      const visit = String(entry?.timestamp);
      if (!rankByVisit.has(visit)) return;
      const value = Number(entry?.value);
      if (!Number.isFinite(value)) return;

      const key = buildNodeKey(visit, value);
      if (!nodesByKey.has(key)) {
        nodesByKey.set(key, {
          key,
          visit,
          value,
          subjectIds: new Set(),
        });
      }
      nodesByKey.get(key).subjectIds.add(subject?.id);
    });
  });

  return [...nodesByKey.values()].sort((a, b) => {
    const rankA = rankByVisit.get(String(a.visit)) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankByVisit.get(String(b.visit)) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    if (a.value !== b.value) return a.value - b.value;
    return String(a.key).localeCompare(String(b.key));
  });
}

function buildAggregatedEdges(subjects = [], visits = []) {
  const edgesByKey = new Map();
  if (!Array.isArray(visits) || visits.length < 2) return [];

  subjects.forEach((subject) => {
    const valueByVisit = new Map();
    (subject?.values || []).forEach((entry) => {
      const numeric = Number(entry?.value);
      if (!Number.isFinite(numeric)) return;
      valueByVisit.set(String(entry?.timestamp), numeric);
    });

    for (let i = 0; i < visits.length - 1; i += 1) {
      const fromVisit = String(visits[i]);
      const toVisit = String(visits[i + 1]);
      if (!valueByVisit.has(fromVisit) || !valueByVisit.has(toVisit)) continue;

      const fromValue = valueByVisit.get(fromVisit);
      const toValue = valueByVisit.get(toVisit);
      const key = buildEdgeKey(fromVisit, fromValue, toVisit, toValue);

      if (!edgesByKey.has(key)) {
        edgesByKey.set(key, {
          key,
          fromVisit,
          fromValue,
          toVisit,
          toValue,
          subjectIds: new Set(),
        });
      }
      edgesByKey.get(key).subjectIds.add(subject?.id);
    }
  });

  const rankByVisit = new Map(
    visits.map((visit, index) => [String(visit), index]),
  );
  return [...edgesByKey.values()].sort((a, b) => {
    const rankA =
      rankByVisit.get(String(a.fromVisit)) ?? Number.MAX_SAFE_INTEGER;
    const rankB =
      rankByVisit.get(String(b.fromVisit)) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    if (a.fromValue !== b.fromValue) return a.fromValue - b.fromValue;
    if (a.toValue !== b.toValue) return a.toValue - b.toValue;
    return String(a.key).localeCompare(String(b.key));
  });
}

function toggleNodeSelection(prevSelectedNodesByVisit, visit, value) {
  const visitKey = String(visit);
  const valueKey = valueToKey(value);
  const next = { ...prevSelectedNodesByVisit };
  const current = new Set(next[visitKey] || []);

  if (current.has(valueKey)) {
    current.delete(valueKey);
  } else {
    current.add(valueKey);
  }

  if (current.size === 0) {
    delete next[visitKey];
  } else {
    next[visitKey] = current;
  }

  return next;
}

function toggleVisitSelection(prevSelectedNodesByVisit, visit, valueKeys = []) {
  const visitKey = String(visit);
  const next = { ...prevSelectedNodesByVisit };
  const available = [...new Set((valueKeys || []).map((key) => String(key)))];
  if (!available.length) return next;

  const current = new Set(next[visitKey] || []);
  const allSelected = available.every((key) => current.has(key));

  if (allSelected) {
    delete next[visitKey];
    return next;
  }

  next[visitKey] = new Set(available);
  return next;
}

function clearSelectedNodes() {
  return {};
}

function hasSelectedNodes(selectedNodesByVisit) {
  if (!selectedNodesByVisit) return false;
  return Object.values(selectedNodesByVisit).some(
    (values) => values && values.size > 0,
  );
}

function computeCompatibleSubjects(
  selectedNodesByVisit,
  activeEvolutionSubjects = [],
) {
  const selectedEntries = Object.entries(selectedNodesByVisit || {}).filter(
    ([, allowedValues]) => allowedValues && allowedValues.size > 0,
  );

  const allIds = new Set(activeEvolutionSubjects.map((subject) => subject?.id));
  if (!selectedEntries.length) return allIds;

  const compatible = new Set();
  activeEvolutionSubjects.forEach((subject) => {
    const valueByVisit = new Map(
      (subject?.values || []).map((entry) => [
        String(entry?.timestamp),
        Number(entry?.value),
      ]),
    );

    const matchesAllVisits = selectedEntries.every(([visit, allowedValues]) => {
      if (!valueByVisit.has(visit)) return false;
      const value = valueByVisit.get(visit);
      if (!Number.isFinite(value)) return false;
      return allowedValues.has(valueToKey(value));
    });

    if (matchesAllVisits) compatible.add(subject?.id);
  });

  return compatible;
}

function computeNodeTotals(nodes = []) {
  const totals = new Map();
  nodes.forEach((node) => {
    totals.set(node.key, node.subjectIds?.size || 0);
  });
  return totals;
}

function computeNodeCompatibleCounts(
  nodes = [],
  compatibleSubjects = new Set(),
) {
  const compatibleCounts = new Map();
  nodes.forEach((node) => {
    let count = 0;
    (node.subjectIds || []).forEach((subjectId) => {
      if (compatibleSubjects.has(subjectId)) count += 1;
    });
    compatibleCounts.set(node.key, count);
  });
  return compatibleCounts;
}

function computeEdgeTotals(edges = []) {
  const totals = new Map();
  edges.forEach((edge) => {
    totals.set(edge.key, edge.subjectIds?.size || 0);
  });
  return totals;
}

function computeEdgeCompatibleCounts(
  edges = [],
  compatibleSubjects = new Set(),
) {
  const compatibleCounts = new Map();
  edges.forEach((edge) => {
    let count = 0;
    (edge.subjectIds || []).forEach((subjectId) => {
      if (compatibleSubjects.has(subjectId)) count += 1;
    });
    compatibleCounts.set(edge.key, count);
  });
  return compatibleCounts;
}

function getDiscreteYRange(subjects = []) {
  if (!Array.isArray(subjects) || !subjects.length) return [0, 1];
  const values = subjects
    .flatMap((subject) => subject?.values || [])
    .map((entry) => Number(entry?.value))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [min, max];
}

function createRatioScale(scaleType = "sqrt", maxValue = 1, range = [1, 10]) {
  const safeMax = Math.max(1, Number(maxValue) || 1);
  const [minRange, maxRange] = range;

  if (scaleType === "linear") {
    return d3.scaleLinear().domain([1, safeMax]).range([minRange, maxRange]);
  }

  if (scaleType === "log") {
    return d3.scaleLog().domain([1, safeMax]).range([minRange, maxRange]);
  }

  return d3.scaleSqrt().domain([1, safeMax]).range([minRange, maxRange]);
}

function normalizePixelRange(
  rawMin,
  rawMax,
  fallbackMin,
  fallbackMax,
  absoluteMin = 0,
) {
  const parsedMin = Number(rawMin);
  const parsedMax = Number(rawMax);
  let min = Number.isFinite(parsedMin) ? parsedMin : fallbackMin;
  let max = Number.isFinite(parsedMax) ? parsedMax : fallbackMax;

  min = Math.max(absoluteMin, min);
  max = Math.max(absoluteMin, max);

  if (max < min) {
    const tmp = min;
    min = max;
    max = tmp;
  }

  if (max === min) {
    max = min + Math.max(0.5, absoluteMin * 0.1);
  }

  return [min, max];
}

function formatRatio(compatible, total) {
  if (!total) return "0.0%";
  return `${((compatible / total) * 100).toFixed(1)}%`;
}

function getRectEdgePoint(fromRect, toRect) {
  const dx = toRect.x - fromRect.x;
  const dy = toRect.y - fromRect.y;
  if (dx === 0 && dy === 0) {
    return { x: fromRect.x, y: fromRect.y };
  }

  const halfW = Math.max(1, fromRect.width / 2);
  const halfH = Math.max(1, fromRect.height / 2);
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);

  return {
    x: fromRect.x + dx * scale,
    y: fromRect.y + dy * scale,
  };
}

function buildLeadingRoundedRectPath(x, y, width, height, radius = 4) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return "";

  const r = Math.max(0, Math.min(Number(radius) || 0, h / 2, w));
  const right = x + w;
  const bottom = y + h;

  if (r === 0) {
    return `M${x},${y}H${right}V${bottom}H${x}Z`;
  }

  return [
    `M${x + r},${y}`,
    `H${right}`,
    `V${bottom}`,
    `H${x + r}`,
    `Q${x},${bottom} ${x},${bottom - r}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    "Z",
  ].join(" ");
}

function buildRoundedRectPath(x, y, width, height, radius = 4) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return "";

  const r = Math.max(0, Math.min(Number(radius) || 0, h / 2, w / 2));
  const right = x + w;
  const bottom = y + h;

  if (r === 0) {
    return `M${x},${y}H${right}V${bottom}H${x}Z`;
  }

  return [
    `M${x + r},${y}`,
    `H${right - r}`,
    `Q${right},${y} ${right},${y + r}`,
    `V${bottom - r}`,
    `Q${right},${bottom} ${right - r},${bottom}`,
    `H${x + r}`,
    `Q${x},${bottom} ${x},${bottom - r}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    "Z",
  ].join(" ");
}

function renderDiscreteAggregated({
  chart,
  x,
  y,
  color,
  activeGroup,
  tooltip,
  discreteAggregates,
  selectedNodesByVisit,
  onToggleNodeSelection,
  onNodeHover,
  onEdgeHover,
  hoveredEdge,
  ratioNodeScale = "sqrt",
  ratioEdgeScale = "sqrt",
  ratioNodeMinPx = 10,
  ratioNodeMaxPx = 30,
  ratioEdgeMinPx = 2.5,
  ratioEdgeMaxPx = 16,
}) {
  if (!discreteAggregates) return;

  const {
    nodes,
    edges,
    nodeTotals,
    nodeCompatibleCounts,
    edgeTotals,
    edgeCompatibleCounts,
  } = discreteAggregates;

  const activeColor = color(activeGroup);
  const hasActiveNodeSelection = hasSelectedNodes(selectedNodesByVisit);
  const maxNodeTotal = Math.max(
    1,
    ...nodes.map((node) => nodeTotals.get(node.key) || 0),
  );
  const maxEdgeTotal = Math.max(
    1,
    ...edges.map((edge) => edgeTotals.get(edge.key) || 0),
  );
  const nodeRange = normalizePixelRange(
    ratioNodeMinPx,
    ratioNodeMaxPx,
    10,
    30,
    1,
  );
  const edgeRange = normalizePixelRange(
    ratioEdgeMinPx,
    ratioEdgeMaxPx,
    2.5,
    16,
    0.5,
  );
  const nodeHeightScale = createRatioScale(ratioNodeScale, maxNodeTotal, nodeRange);
  const edgeWidthScale = createRatioScale(ratioEdgeScale, maxEdgeTotal, edgeRange);
  const nodeWidth = getDiscreteNodeWidthFromBandwidth(x.bandwidth());

  const nodeCenters = new Map();
  nodes.forEach((node) => {
    const centerX = x(String(node.visit)) + x.bandwidth() / 2;
    const centerY = y(Number(node.value));
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return;
    const total = nodeTotals.get(node.key) || 0;
    const height = nodeHeightScale(Math.max(1, total));
    nodeCenters.set(node.key, {
      x: centerX,
      y: centerY,
      width: nodeWidth,
      height,
    });
  });

  const edgeLayer = chart
    .append("g")
    .attr("class", "discrete-aggregated-edges");

  const edgeGroups = edgeLayer
    .selectAll("g.discrete-edge")
    .data(edges, (edge) => edge.key)
    .join("g")
    .attr("class", "discrete-edge");

  edgeGroups.append("line").attr("class", "discrete-edge-base");

  edgeGroups.append("line").attr("class", "discrete-edge-compatible");

  edgeGroups.each(function (edge) {
    const sourceKey = buildNodeKey(edge.fromVisit, edge.fromValue);
    const targetKey = buildNodeKey(edge.toVisit, edge.toValue);
    const source = nodeCenters.get(sourceKey);
    const target = nodeCenters.get(targetKey);

    if (!source || !target) {
      d3.select(this).style("display", "none");
      return;
    }

    const total = edgeTotals.get(edge.key) || 0;
    const compatible = edgeCompatibleCounts.get(edge.key) || 0;
    const ratio = total > 0 ? compatible / total : 0;
    const baseWidth = edgeWidthScale(Math.max(1, total));
    const isHovered = hoveredEdge?.key === edge.key;
    const sourcePoint = getRectEdgePoint(source, target);
    const targetPoint = getRectEdgePoint(target, source);

    d3.select(this)
      .style("display", null)
      .select(".discrete-edge-base")
      .attr("x1", sourcePoint.x)
      .attr("y1", sourcePoint.y)
      .attr("x2", targetPoint.x)
      .attr("y2", targetPoint.y)
      .attr("stroke", activeColor)
      .attr("stroke-width", baseWidth)
      .attr("stroke-opacity", isHovered ? 0.35 : 0.18)
      .attr("stroke-linecap", "round");

    d3.select(this)
      .select(".discrete-edge-compatible")
      .attr("x1", sourcePoint.x)
      .attr("y1", sourcePoint.y)
      .attr("x2", targetPoint.x)
      .attr("y2", targetPoint.y)
      .attr("stroke", activeColor)
      .attr("stroke-width", baseWidth * ratio)
      .attr("stroke-opacity", ratio > 0 ? 1 : 0)
      .attr("stroke-linecap", "round");

    d3.select(this)
      .on("mouseover", function () {
        const html = `
          <strong>Transition</strong><br/>
          ${edge.fromVisit}: ${edge.fromValue} → ${edge.toVisit}: ${edge.toValue}<br/>
          Total: ${total}<br/>
          Compatible: ${compatible}<br/>
          Ratio: ${formatRatio(compatible, total)}
        `;
        onEdgeHover?.(edge);
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        onEdgeHover?.(null);
        tooltip.style("opacity", 0);
      });
  });

  const nodeLayer = chart
    .append("g")
    .attr("class", "discrete-aggregated-nodes");

  const nodeGroups = nodeLayer
    .selectAll("g.discrete-node")
    .data(nodes, (node) => node.key)
    .join("g")
    .attr("class", "discrete-node");

  nodeGroups
    .append("rect")
    .attr("class", "discrete-node-base")
    .attr("rx", 4)
    .attr("ry", 4);

  nodeGroups.append("path").attr("class", "discrete-node-compatible");

  nodeGroups
    .append("rect")
    .attr("class", "discrete-node-outline")
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", "none");

  nodeGroups.each(function (node) {
    const center = nodeCenters.get(node.key);
    if (!center) {
      d3.select(this).style("display", "none");
      return;
    }
    const total = nodeTotals.get(node.key) || 0;
    const compatible = nodeCompatibleCounts.get(node.key) || 0;
    const ratio = total > 0 ? compatible / total : 0;
    const selectedValues = selectedNodesByVisit?.[String(node.visit)];
    const isSelected = selectedValues?.has(valueToKey(node.value)) || false;

    const left = center.x - center.width / 2;
    const top = center.y - center.height / 2;

    d3.select(this)
      .style("display", null)
      .attr("transform", `translate(${left},${top})`);

    d3.select(this)
      .select(".discrete-node-base")
      .attr("width", center.width)
      .attr("height", center.height)
      .attr("fill", d3.interpolateRgb("#ffffff", activeColor)(0.2))
      .attr("fill-opacity", 1);

    d3.select(this)
      .select(".discrete-node-compatible")
      .attr(
        "d",
        hasActiveNodeSelection
          ? buildLeadingRoundedRectPath(
              0,
              0,
              center.width * ratio,
              center.height,
              4,
            )
          : buildRoundedRectPath(0, 0, center.width * ratio, center.height, 4),
      )
      .attr("fill", activeColor)
      .attr("fill-opacity", ratio > 0 ? 1 : 0);

    d3.select(this)
      .select(".discrete-node-outline")
      .attr("width", center.width)
      .attr("height", center.height)
      .attr("stroke", isSelected ? "var(--color-ink)" : "none")
      .attr("stroke-width", isSelected ? 2.6 : 0)
      .attr("stroke-opacity", isSelected ? 1 : 0);

    d3.select(this)
      .on("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        onToggleNodeSelection?.(node.visit, node.value);
      })
      .on("mouseover", function () {
        const html = `
          <strong>Node</strong><br/>
          Visit: ${node.visit}<br/>
          Value: ${node.value}<br/>
          Total: ${total}<br/>
          Compatible: ${compatible}<br/>
          Ratio: ${formatRatio(compatible, total)}
        `;
        onNodeHover?.(node);
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        onNodeHover?.(null);
        tooltip.style("opacity", 0);
      });
  });
}

function renderLineLegend(
  legend,
  groups,
  color,
  hide,
  setHide,
  {
    onItemMouseOver,
    onItemMouseOut,
    onCircleClick,
    clearSelectionVisible = false,
    onClearSelection,
    showDiscreteAggregatedLegend = false,
    discreteLegendColor = "#4f46e5",
    discreteHasSelection = false,
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
  const discreteLegendHeight = showDiscreteAggregatedLegend
    ? renderDiscreteLegendBlock(legendGroup, {
        y: 0,
        color: discreteLegendColor,
        hasSelection: discreteHasSelection,
      })
    : 0;
  const legendStartY = discreteLegendHeight > 0 ? discreteLegendHeight + 14 : 0;

  orderedGroups.forEach((group, i) => {
    const y = legendStartY + i * lineHeight + circleSize * 2;

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
        const groupKey = String(group);

        setHide((prev) => {
          const normalized = prev.map((entry) => String(entry));
          const isHidden = normalized.includes(groupKey);
          const next = isHidden
            ? normalized.filter((g) => g !== groupKey)
            : [...normalized, groupKey];

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
      .style("fill", color(group))
      .on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onCircleClick?.(group);
      });

    legendItem
      .append("text")
      .attr("class", "legend-label")
      .classed(
        "cross",
        hide.map((entry) => String(entry)).includes(String(group)),
      )
      .attr("x", circleSize * 2 + 15)
      .attr("y", 4)
      .text(group);
  });

  if (clearSelectionVisible) {
    const y =
      legendStartY + orderedGroups.length * lineHeight + circleSize * 2 + 10;
    legendGroup
      .append("text")
      .attr("class", "legend-label")
      .attr("x", circleSize + 10)
      .attr("y", y)
      .style("font-weight", 700)
      .style("text-decoration", "underline")
      .text("Clear selection")
      .on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClearSelection?.();
      });
  }

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

function renderDiscreteLegendBlock(
  legendGroup,
  { y = 0, color = "#4f46e5", hasSelection = false } = {},
) {
  const block = legendGroup
    .append("g")
    .attr("class", "discrete-legend-block")
    .attr("transform", `translate(0, ${y})`);
  const blockWidth = 246;
  const blockHeight = 144;

  block
    .append("rect")
    .attr("x", -8)
    .attr("y", -14)
    .attr("width", blockWidth)
    .attr("height", blockHeight)
    .attr("rx", 8)
    .attr("ry", 8)
    .attr("fill", "rgba(248, 250, 252, 0.9)")
    .attr("stroke", "rgba(148, 163, 184, 0.45)")
    .attr("stroke-width", 1);

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", 8)
    .style("font-weight", 700)
    .text("Ratio Mode");

  const itemX = 0;
  const item1Y = 32;
  const item2Y = 62;
  const item3Y = 96;
  const legendLineX1 = itemX + 2;
  const legendLineX2 = itemX + 38;
  const legendLineY = item3Y + 6;
  const legendLineTotalWidth = 14;
  const legendLineCompatibleRatio = 0.42;

  block
    .append("rect")
    .attr("x", itemX + 8)
    .attr("y", item1Y + 4)
    .attr("width", 14)
    .attr("height", 12)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2))
    .attr("stroke", "rgba(15, 23, 42, 0.25)");

  block
    .append("rect")
    .attr("x", itemX + 28)
    .attr("y", item1Y - 4)
    .attr("width", 14)
    .attr("height", 20)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2))
    .attr("stroke", "rgba(15, 23, 42, 0.25)");

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item1Y + 10)
    .style("font-size", "11px")
    .text("Node height = count");

  block
    .append("line")
    .attr("x1", legendLineX1)
    .attr("y1", legendLineY)
    .attr("x2", legendLineX2)
    .attr("y2", legendLineY)
    .attr("stroke", color)
    .attr("stroke-width", legendLineTotalWidth)
    .attr("stroke-opacity", 0.2)
    .attr("stroke-linecap", "butt");

  block
    .append("line")
    .attr("x1", legendLineX1)
    .attr("y1", legendLineY)
    .attr("x2", legendLineX2)
    .attr("y2", legendLineY)
    .attr("stroke", color)
    .attr("stroke-width", legendLineTotalWidth * legendLineCompatibleRatio)
    .attr("stroke-linecap", "butt");

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item3Y + 10)
    .style("font-size", "11px")
    .text("Line fill = compatible ratio");

  block
    .append("rect")
    .attr("x", itemX + 0)
    .attr("y", item2Y - 2)
    .attr("width", 36)
    .attr("height", 16)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", d3.interpolateRgb("#ffffff", color)(0.2));

  block
    .append("path")
    .attr("x", itemX + 0)
    .attr("y", item2Y - 2)
    .attr(
      "d",
      hasSelection
        ? buildLeadingRoundedRectPath(itemX + 0, item2Y - 2, 20, 16, 3)
        : buildRoundedRectPath(itemX + 0, item2Y - 2, 20, 16, 3),
    )
    .attr("fill", color);

  block
    .append("rect")
    .attr("x", itemX + 0)
    .attr("y", item2Y - 2)
    .attr("width", 36)
    .attr("height", 16)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", "none")
    .attr("stroke", "var(--color-ink)")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  block
    .append("text")
    .attr("class", "legend-label")
    .attr("x", itemX + 52)
    .attr("y", item2Y + 10)
    .style("font-size", "11px")
    .text("Fill = compatible ratio");

  return blockHeight;
}

function getDiscreteNodeWidthFromBandwidth(bandwidth) {
  return Math.max(14, Math.min(34, bandwidth * 0.56));
}

function getDiscreteDefaultMeanRadius(bandwidth) {
  return getDiscreteNodeWidthFromBandwidth(bandwidth) / 2;
}
