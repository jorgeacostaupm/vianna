import * as d3 from "d3";

import { moveTooltip } from "@/utils/functions";

import { getDiscreteDefaultMeanRadius } from "./discreteGeometry";

export function getEffectiveMeanMarkerSizes({
  isDiscreteAggregatedMode,
  meanPointSize,
  bandwidth,
}) {
  const normalizedPointSize = Number.isFinite(Number(meanPointSize))
    ? Number(meanPointSize)
    : 4;
  const meanPointRadius =
    isDiscreteAggregatedMode && Number.isFinite(Number(bandwidth))
      ? getDiscreteDefaultMeanRadius(bandwidth)
      : normalizedPointSize;
  const meanVisualRadius = isDiscreteAggregatedMode
    ? meanPointRadius
    : Math.max(normalizedPointSize, 4);

  return {
    meanPointRadius,
    meanVisualRadius,
  };
}

export function renderMeans({
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
}) {
  if (!data?.meanData) return;

  const line = d3
    .line()
    .defined((point) => Number.isFinite(Number(point.value.mean)))
    .x((point) => x(point.time) + x.bandwidth() / 2)
    .y((point) => y(Number(point.value.mean)));

  const { applyMeanLineStyle, applyMeanPointStyle } = createMeanStyling({
    meanStrokeWidth,
    meanPointSize,
    isDiscreteAggregatedMode,
    bandwidth: x.bandwidth(),
  });

  if (showStds) {
    const area = d3
      .area()
      .defined(
        (point) =>
          Number.isFinite(Number(point.value.mean)) &&
          Number.isFinite(Number(point.value.std)),
      )
      .x((point) => x(point.time) + x.bandwidth() / 2)
      .y0((point) => y(Number(point.value.mean) - Number(point.value.std)))
      .y1((point) => y(Number(point.value.mean) + Number(point.value.std)))
      .curve(d3.curveMonotoneX);

    const bands = chart
      .selectAll(".evolutionStd")
      .data(data.meanData, (entry) => entry.group)
      .join("g")
      .attr("class", "evolutionStd")
      .classed("hide", (entry) => hide.includes(entry.group));

    bands
      .append("path")
      .attr("d", (entry) => area(entry.values))
      .attr("fill", (entry) => color(entry.group))
      .attr("opacity", 0.2);
  }

  if (showCIs && !meanAsBoxplot) {
    const barWidth = x.bandwidth() * 0.1;

    data.meanData.forEach((groupData) => {
      const group = chart
        .append("g")
        .attr("class", "evolutionCI")
        .datum(groupData)
        .classed("hide", hide.includes(groupData.group));

      groupData.values.forEach((value) => {
        group
          .append("line")
          .attr("x1", x(value.time) + x.bandwidth() / 2)
          .attr("x2", x(value.time) + x.bandwidth() / 2)
          .attr("y1", y(value.value.ci95.lower))
          .attr("y2", y(value.value.ci95.upper))
          .attr("stroke", color(groupData.group))
          .attr("stroke-width", 2);

        group
          .append("line")
          .attr("x1", x(value.time) + x.bandwidth() / 2 - barWidth / 2)
          .attr("x2", x(value.time) + x.bandwidth() / 2 + barWidth / 2)
          .attr("y1", y(value.value.ci95.upper))
          .attr("y2", y(value.value.ci95.upper))
          .attr("stroke", color(groupData.group))
          .attr("stroke-width", 2);

        group
          .append("line")
          .attr("x1", x(value.time) + x.bandwidth() / 2 - barWidth / 2)
          .attr("x2", x(value.time) + x.bandwidth() / 2 + barWidth / 2)
          .attr("y1", y(value.value.ci95.lower))
          .attr("y2", y(value.value.ci95.lower))
          .attr("stroke", color(groupData.group))
          .attr("stroke-width", 2);
      });
    });
  }

  const means = chart
    .selectAll(".evolutionMean")
    .data(data.meanData, (entry) => entry.group)
    .join(
      (enter) => {
        const group = enter.append("g").attr("class", "evolutionMean");
        group.append("path").attr("class", "evolutionMeanLine").attr("fill", "none");
        group.append("g").attr("class", "means");
        return group;
      },
      (update) => update,
      (exit) => exit.remove(),
    )
    .classed("hide", (entry) => hide.includes(entry.group));

  means.each(function (groupData) {
    const group = d3.select(this);
    const groupColor = color(groupData.group);

    applyMeanLineStyle(
      group
        .select(".evolutionMeanLine")
        .datum(groupData.values)
        .attr("d", line),
      groupColor,
    );

    const meansLayer = group.select(".means");
    if (meanAsBoxplot) {
      meansLayer.selectAll("circle.mean").remove();
      renderSummaryMarkers({
        container: meansLayer,
        values: groupData.values,
        x,
        y,
        strokeColor: groupColor,
        tooltip,
        chart,
        keyPrefix: groupData.group,
        tooltipTitle: groupData.group,
      });
      return;
    }

    meansLayer.selectAll("g.mean-marker").remove();
    const meanPoints = meansLayer
      .selectAll("circle.mean")
      .data(groupData.values, (value) => `${groupData.group}-${value.time}`)
      .join("circle")
      .attr("class", "mean");

    applyMeanPointStyle(
      meanPoints
        .attr("cx", (value) => x(value.time) + x.bandwidth() / 2)
        .attr("cy", (value) => y(value.value.mean)),
      groupColor,
    )
      .on("mouseover", function (_event, value) {
        tooltip
          .style("opacity", 1)
          .html(buildMeanTooltipHtml(groupData.group, value));
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });
  });
}

export function renderOverallMean({
  chart,
  overallMeanData,
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
}) {
  const overall = overallMeanData;
  if (!showOverallMean || !overall?.values?.length) {
    chart.selectAll(".evolutionOverallMean").remove();
    chart.selectAll(".evolutionOverallCI").remove();
    return;
  }

  const overallGroup = overall.group ?? "All";
  const overallColor = color(overallGroup);
  const line = d3
    .line()
    .defined((point) => Number.isFinite(Number(point.value?.mean)))
    .x((point) => x(point.time) + x.bandwidth() / 2)
    .y((point) => y(Number(point.value.mean)));

  const { applyMeanLineStyle, applyMeanPointStyle } = createMeanStyling({
    meanStrokeWidth,
    meanPointSize,
    isDiscreteAggregatedMode,
    bandwidth: x.bandwidth(),
  });

  const overallSelection = chart
    .selectAll(".evolutionOverallMean")
    .data([overall], () => "overall-mean")
    .join(
      (enter) => {
        const group = enter.append("g").attr("class", "evolutionOverallMean");
        group
          .append("path")
          .attr("class", "evolutionOverallMeanLine evolutionMeanLine")
          .attr("fill", "none");
        group.append("g").attr("class", "overall-means");
        return group;
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
    renderSummaryMarkers({
      container: overallLayer,
      values: overall.values,
      x,
      y,
      strokeColor: overallColor,
      tooltip,
      chart,
      keyPrefix: "overall",
      markerClass: "overall-mean-marker",
      tooltipTitle: "All groups",
      includeCount: true,
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
        .attr("cy", (value) => y(Number(value.value.mean))),
      overallColor,
    )
      .on("mouseover", function (_event, value) {
        tooltip
          .style("opacity", 1)
          .html(buildMeanTooltipHtml("All groups", value, { includeCount: true }));
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
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
        const group = enter.append("g").attr("class", "evolutionOverallCI");
        group.append("g").attr("class", "overall-ci-lines");
        return group;
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
    .data(ciLines, (lineValue) => lineValue.key)
    .join("line")
    .attr("x1", (lineValue) => lineValue.x1)
    .attr("x2", (lineValue) => lineValue.x2)
    .attr("y1", (lineValue) => lineValue.y1)
    .attr("y2", (lineValue) => lineValue.y2)
    .attr("stroke", overallColor)
    .attr("stroke-width", 2);
}

function createMeanStyling({
  meanStrokeWidth,
  meanPointSize,
  isDiscreteAggregatedMode,
  bandwidth,
}) {
  const { meanVisualRadius } = getEffectiveMeanMarkerSizes({
    isDiscreteAggregatedMode,
    meanPointSize,
    bandwidth,
  });
  const meanLineDasharray = "8 16";
  const meanPointStroke = "black";
  const meanPointStrokeWidth = 2;

  return {
    applyMeanLineStyle(selection, strokeColor) {
      return selection
        .attr("stroke", strokeColor)
        .attr("stroke-width", meanStrokeWidth)
        .attr("stroke-dasharray", meanLineDasharray)
        .attr("fill", "none");
    },
    applyMeanPointStyle(selection, fillColor) {
      return selection
        .attr("fill", fillColor)
        .attr("stroke", meanPointStroke)
        .attr("stroke-width", meanPointStrokeWidth)
        .attr("r", meanVisualRadius);
    },
  };
}

function renderSummaryMarkers({
  container,
  values,
  x,
  y,
  strokeColor,
  tooltip,
  chart,
  keyPrefix,
  markerClass = "mean-marker",
  tooltipTitle,
  includeCount = false,
}) {
  const markerWidth = Math.max(8, x.bandwidth() * 0.24);
  const halfCap = markerWidth * 0.35;
  const markers = container
    .selectAll(`g.${markerClass}`)
    .data(values, (value) => `${keyPrefix}-${value.time}`)
    .join((enter) => {
      const group = enter.append("g").attr("class", markerClass);
      group.append("line").attr("class", "mean-whisker");
      group.append("line").attr("class", "mean-whisker-cap-top");
      group.append("line").attr("class", "mean-whisker-cap-bottom");
      group.append("rect").attr("class", "mean-box");
      group.append("line").attr("class", "mean-median");
      return group;
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

    const marker = d3.select(this);
    marker
      .select(".mean-whisker")
      .attr("x1", centerX)
      .attr("x2", centerX)
      .attr("y1", yWhiskerTop)
      .attr("y2", yWhiskerBottom)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1.6);
    marker
      .select(".mean-whisker-cap-top")
      .attr("x1", centerX - halfCap)
      .attr("x2", centerX + halfCap)
      .attr("y1", yWhiskerTop)
      .attr("y2", yWhiskerTop)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1.6);
    marker
      .select(".mean-whisker-cap-bottom")
      .attr("x1", centerX - halfCap)
      .attr("x2", centerX + halfCap)
      .attr("y1", yWhiskerBottom)
      .attr("y2", yWhiskerBottom)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1.6);
    marker
      .select(".mean-box")
      .attr("x", centerX - markerWidth / 2)
      .attr("y", yBoxTop)
      .attr("width", markerWidth)
      .attr("height", boxHeight)
      .attr("fill", d3.color(strokeColor)?.copy({ opacity: 0.28 }) || strokeColor)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 1.4);
    marker
      .select(".mean-median")
      .attr("x1", centerX - markerWidth / 2)
      .attr("x2", centerX + markerWidth / 2)
      .attr("y1", y(mean))
      .attr("y2", y(mean))
      .attr("stroke", "black")
      .attr("stroke-width", 2.4);
  });

  markers
    .on("mouseover", function (_event, value) {
      tooltip
        .style("opacity", 1)
        .html(buildMeanTooltipHtml(tooltipTitle, value, { includeCount }));
    })
    .on("mousemove", function (event) {
      moveTooltip(event, tooltip, chart);
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    });
}

function buildMeanTooltipHtml(title, value, { includeCount = false } = {}) {
  return `
    <strong>${title}</strong><br/>
    ${value.time}<br/>
    Mean: ${Number(value.value.mean).toFixed(2)}<br/>
    Std: ${Number(value.value.std).toFixed(2)}${includeCount ? `<br/>n: ${value.value.count}` : ""}
  `;
}
