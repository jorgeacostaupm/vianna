import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import useResizeObserver from "@/hooks/useResizeObserver";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import { paintLayersInOrder } from "@/utils/gridInteractions";
import { selectEvolutionAnalysisContext } from "@/store/features/main";

import {
  buildAggregatedEdges,
  buildAggregatedNodes,
  clearSelectedNodes,
  computeCompatibleSubjects,
  computeEdgeCompatibleCounts,
  computeEdgeTotals,
  computeNodeCompatibleCounts,
  computeNodeTotals,
  detectDiscreteLowCardinality,
  detectSingleActiveEvolution,
  hasSelectedNodes,
  toggleNodeSelection,
  toggleVisitSelection,
  valueToKey,
} from "./lineChart/discreteAggregation";
import { renderDiscreteAggregated } from "./lineChart/discreteRendering";
import {
  getEffectiveMeanMarkerSizes,
  renderMeans,
  renderOverallMean,
} from "./lineChart/renderMeans";
import { renderLineLegend } from "./lineChart/legend";
import { renderLmm } from "./lineChart/renderLmm";
import { renderParticipants } from "./lineChart/renderParticipants";
import { initializeLineChartScene } from "./lineChart/setupChart";
import {
  getDiscreteYRange,
  getYRange,
  resolveYDomain,
} from "./lineChart/yDomain";

const DEFAULT_HIDDEN_GROUPS = ["All"];

export default function useLineChart({ chartRef, data, config }) {
  const dimensions = useResizeObserver(chartRef);
  const { groupVar } = useSelector(selectEvolutionAnalysisContext);
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
    disableAutoDiscreteAggregatedMode,
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
    yAxisMode,
    yAxisMin,
    yAxisMax,
  } = config || {};

  const rawGroups = useMemo(
    () =>
      collectVisibleGroups({
        data,
        showMeans,
        showObs,
        showLmmFit,
        showLmmCI,
        showOverallMean,
      }),
    [
      data?.meanData,
      data?.participantData,
      data?.lmm?.predictions,
      data?.overallMeanData,
      showMeans,
      showObs,
      showLmmFit,
      showLmmCI,
      showOverallMean,
    ],
  );
  const { colorDomain, orderedGroups: groups } = useGroupColorDomain(
    groupVar,
    rawGroups,
  );
  const selectionGroups = groups;
  const selectionTimestamps = useMemo(
    () => (data?.times || []).map((timestamp) => String(timestamp)),
    [data?.times],
  );
  const selectionTimestampsKey = selectionTimestamps.join("|");

  const [hide, setHide] = useState(DEFAULT_HIDDEN_GROUPS);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [selectedNodesByVisit, setSelectedNodesByVisit] = useState({});
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const visibleParticipantGroups = useMemo(() => {
    const source = Array.isArray(data?.participantData) ? data.participantData : [];
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
    if (!isSingleEvolutionMode || !Array.isArray(data?.participantData)) return [];
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
    [activeEvolutionSubjects, selectionTimestampsKey],
  );

  const isDiscreteAggregatedMode =
    isSingleEvolutionMode &&
    (forceDiscreteAggregatedMode ||
      (isDiscreteLowCardinalityMode && !disableAutoDiscreteAggregatedMode));

  const compatibleSubjects = useMemo(
    () =>
      computeCompatibleSubjects(selectedNodesByVisit, activeEvolutionSubjects),
    [selectedNodesByVisit, activeEvolutionSubjects],
  );

  const discreteAggregates = useMemo(() => {
    if (!isDiscreteAggregatedMode) return null;

    const nodes = buildAggregatedNodes(activeEvolutionSubjects, selectionTimestamps);
    const edges = buildAggregatedEdges(activeEvolutionSubjects, selectionTimestamps);
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
    selectionTimestamps,
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
    setHide((prev) =>
      prev.filter(
        (group) =>
          validGroups.has(String(group)) ||
          DEFAULT_HIDDEN_GROUPS.includes(String(group)),
      ),
    );
  }, [rawGroups]);

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
    if (!dimensions || !data || !chartRef.current) return;

    const hiddenGroupSet = new Set((hide || []).map((group) => String(group)));
    const autoYDomain = isDiscreteAggregatedMode
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
    const yDomain = resolveYDomain(autoYDomain, {
      yAxisMode,
      yAxisMin,
      yAxisMax,
    });

    const scene = initializeLineChartScene({
      chartRef,
      dimensions,
      selectionTimestamps,
      colorDomain,
      yDomain,
      useNiceY: yAxisMode !== "manual",
      showGrid,
      showLegend: showLegend !== false,
      legendMaxWidth: isDiscreteAggregatedMode ? 268 : 208,
    });
    const {
      chart,
      legend,
      color,
      x,
      y,
      xAxisG,
      yAxisG,
      yGridG,
      tooltip,
    } = scene;

    chartStateRef.current = scene;

    const meanRendererProps = {
      chart,
      data,
      x,
      y,
      color,
      hide,
      tooltip,
      showStds,
      showCIs,
      meanAsBoxplot,
      meanStrokeWidth,
      meanPointSize,
      isDiscreteAggregatedMode,
    };

    if (isDiscreteAggregatedMode) {
      if (showMeans) {
        renderMeans(meanRendererProps);
      }
      renderOverallMean({
        chart,
        overallMeanData: data?.overallMeanData,
        x,
        y,
        color,
        hide,
        tooltip,
        showOverallMean,
        showCIs,
        meanAsBoxplot,
        meanStrokeWidth,
        meanPointSize,
        isDiscreteAggregatedMode,
      });

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
      if (showObs) {
        renderParticipants({
          chart,
          data,
          x,
          y,
          color,
          hide,
          tooltip,
          selectedSubjectIds,
          setSelectedSubjectIds,
          subjectPointSize,
          subjectStrokeWidth,
        });
      }

      if (showMeans) {
        renderMeans(meanRendererProps);
      }

      renderOverallMean({
        chart,
        overallMeanData: data?.overallMeanData,
        x,
        y,
        color,
        hide,
        tooltip,
        showOverallMean,
        showCIs,
        meanAsBoxplot,
        meanStrokeWidth,
        meanPointSize,
        isDiscreteAggregatedMode,
      });

      if (showLmmFit || showLmmCI) {
        renderLmm({
          chart,
          data,
          x,
          y,
          color,
          hide,
          tooltip,
          showLmmFit,
          showLmmCI,
          meanStrokeWidth,
        });
      }
    }

    const inactiveOpacity = 0.12;
    const reorderByGroupHover = (activeGroup = null) => {
      const rankByGroup = new Map(
        selectionGroups.map((group, index) => [String(group), index]),
      );
      const rankFor = (group) =>
        rankByGroup.get(String(group)) ?? Number.MAX_SAFE_INTEGER;

      const applySort = (selector) => {
        chart.selectAll(selector).sort((left, right) => {
          const leftGroup = String(left?.group ?? "");
          const rightGroup = String(right?.group ?? "");
          if (activeGroup != null) {
            const isLeftActive = leftGroup === String(activeGroup);
            const isRightActive = rightGroup === String(activeGroup);
            if (isLeftActive !== isRightActive) return isLeftActive ? 1 : -1;
          }
          return rankFor(leftGroup) - rankFor(rightGroup);
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
      const resolveOpacity = (entry) => {
        if (!hasActiveGroup) return 1;
        return entry?.group === activeGroup ? 1 : inactiveOpacity;
      };

      chart.selectAll(".evolution").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionMean").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionStd").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionCI").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionLmm").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionLmmCI").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionOverallMean").attr("opacity", resolveOpacity);
      chart.selectAll(".evolutionOverallCI").attr("opacity", resolveOpacity);

      if (legend) {
        legend.selectAll(".legend-item").attr("opacity", (entry) => {
          if (!hasActiveGroup) return 1;
          return entry === activeGroup ? 1 : inactiveOpacity;
        });
      }

      reorderByGroupHover(activeGroup);
    };

    if (showLegend !== false && legend) {
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
        maxWidth: Math.max(0, scene.legendLayout.legendInnerWidth - 43),
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

    return () => {
      if (chartRef.current) {
        scene.svg.selectAll("*").remove();
      }
      chartStateRef.current = {};
    };
  }, [
    data,
    dimensions,
    selectionTimestamps,
    colorDomain,
    hide,
    activeSingleEvolutionId,
    isDiscreteAggregatedMode,
    discreteAggregates,
    activeEvolutionSubjects,
    selectedNodesByVisit,
    hoveredEdge?.key,
    hoveredNode?.key,
    selectedSubjectIds,
    selectionGroups,
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
    disableAutoDiscreteAggregatedMode,
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
    yAxisMode,
    yAxisMin,
    yAxisMax,
  ]);

  useEffect(() => {
    if (!chartStateRef.current.chart) return;

    const { chart, x } = chartStateRef.current;
    const { meanVisualRadius } = getEffectiveMeanMarkerSizes({
      isDiscreteAggregatedMode,
      meanPointSize,
      bandwidth: x?.bandwidth?.(),
    });

    if (meanPointSize != null) {
      chart
        .selectAll("circle.mean")
        .attr("r", meanVisualRadius)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
      chart
        .selectAll("circle.overall-mean")
        .attr("r", meanVisualRadius)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    }
    if (subjectPointSize != null) {
      chart.selectAll("circle.obs-point").attr("r", subjectPointSize);
    }
    if (meanStrokeWidth != null) {
      chart.selectAll(".evolutionMeanLine").attr("stroke-width", meanStrokeWidth);
      chart
        .selectAll(".evolutionLmmLine")
        .attr("stroke-width", Math.max(2, meanStrokeWidth - 1));
    }
    if (subjectStrokeWidth != null) {
      chart.selectAll(".evolution-line").attr("stroke-width", subjectStrokeWidth);
    }
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
    applyHideClasses(chartStateRef.current.chart, hide);
  }, [hide]);
}

function collectVisibleGroups({
  data,
  showMeans,
  showObs,
  showLmmFit,
  showLmmCI,
  showOverallMean,
}) {
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

  return Array.from(new Set(visibleGroups)).filter((value) => value != null);
}

function applyHideClasses(chart, hide) {
  chart.selectAll(".evolutionStd").classed("hide", (entry) => hide.includes(entry.group));
  chart.selectAll(".evolutionCI").classed("hide", (entry) => hide.includes(entry.group));
  chart.selectAll(".evolutionLmm").classed("hide", (entry) => hide.includes(entry.group));
  chart.selectAll(".evolutionLmmCI").classed("hide", (entry) => hide.includes(entry.group));
  chart
    .selectAll(".evolutionOverallMean")
    .classed("hide", (entry) => hide.includes(entry.group));
  chart
    .selectAll(".evolutionOverallCI")
    .classed("hide", (entry) => hide.includes(entry.group));
  chart.selectAll(".evolutionMean").classed("hide", (entry) => hide.includes(entry.group));
  chart.selectAll(".evolution").classed("hide", (entry) => hide.includes(entry.group));
}
