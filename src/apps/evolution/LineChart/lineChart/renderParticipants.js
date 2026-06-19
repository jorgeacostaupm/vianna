import * as d3 from "d3";

import { CHART_OUTLINE } from "@/utils/chartTheme";
import { moveTooltip } from "@/utils/functions";

export function renderParticipants({
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
}) {
  if (!data?.participantData) return;

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
    chart.selectAll(".evolutionOverallMean").attr("opacity", hoveredSubjectOpacity);
    chart.selectAll(".evolutionOverallCI").attr("opacity", hoveredSubjectOpacity);
    chart.selectAll(".evolutionLmm").attr("opacity", hoveredSubjectOpacity);
    chart.selectAll(".evolutionLmmCI").attr("opacity", hoveredSubjectOpacity);
    chart.selectAll(".evolution").each(function (entry) {
      const isActive = activeSubjectIds.has(String(entry?.id));
      const selection = d3.select(this);
      selection.select(".evolution-line").attr(
        "stroke-width",
        isActive ? activeLineWidth : subjectStrokeWidth,
      );
      selection
        .selectAll(".obs-point")
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
    .data(data.participantData, (participant) => participant.id)
    .join(
      (enter) => {
        const group = enter.append("g").attr("class", "evolution");
        group.append("path").attr("class", "evolution-line").attr("fill", "none");
        group.append("g").attr("class", "evolution-points");
        return group;
      },
      (update) => update,
      (exit) => exit.remove(),
    )
    .classed("hide", (participant) => hide.includes(participant.group));

  const line = d3
    .line()
    .defined((point) => Number.isFinite(Number(point.value)))
    .x((point) => x(String(point.timestamp)) + x.bandwidth() / 2)
    .y((point) => y(Number(point.value)));

  evolutions.each(function (participant) {
    const group = d3.select(this);
    const groupColor = color(participant.group);

    group
      .select(".evolution-line")
      .datum(participant.values)
      .attr("d", line)
      .attr("stroke", groupColor)
      .attr("stroke-width", subjectStrokeWidth)
      .attr("fill", "none");

    const points = group
      .select(".evolution-points")
      .selectAll("circle")
      .data(
        participant.values,
        (value, index) => `${participant.id}-${value.timestamp}-${index}`,
      )
      .join(
        (enter) => enter.append("circle").attr("class", "obs-point"),
        (update) => update,
        (exit) => exit.remove(),
      );

    points
      .attr("cx", (value) => x(String(value.timestamp)) + x.bandwidth() / 2)
      .attr("cy", (value) => y(value.value))
      .attr("fill", groupColor)
      .attr("stroke", CHART_OUTLINE)
      .attr("r", subjectPointSize)
      .on("mouseover", function (_event, value) {
        const html = `
          <strong>${participant.id} (${participant.group})</strong><br/>
          ${value.timestamp} : ${value.value}
        `;
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    group
      .on("mouseenter", function () {
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
