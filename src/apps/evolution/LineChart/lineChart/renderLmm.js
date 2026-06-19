import * as d3 from "d3";

import { moveTooltip } from "@/utils/functions";

export function renderLmm({
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
}) {
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
    .defined((point) => Number.isFinite(Number(point.fit)))
    .x((point) => x(point.time) + x.bandwidth() / 2)
    .y((point) => y(Number(point.fit)))
    .curve(d3.curveMonotoneX);

  if (showLmmCI) {
    const area = d3
      .area()
      .defined(
        (point) =>
          Number.isFinite(Number(point?.ci95?.lower)) &&
          Number.isFinite(Number(point?.ci95?.upper)),
      )
      .x((point) => x(point.time) + x.bandwidth() / 2)
      .y0((point) => y(Number(point.ci95.lower)))
      .y1((point) => y(Number(point.ci95.upper)))
      .curve(d3.curveMonotoneX);

    const ciBands = chart
      .selectAll(".evolutionLmmCI")
      .data(predictions, (entry) => entry.group)
      .join(
        (enter) => {
          const group = enter.append("g").attr("class", "evolutionLmmCI");
          group.append("path").attr("class", "evolutionLmmCIBand");
          return group;
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
        const group = enter.append("g").attr("class", "evolutionLmm");
        group.append("path").attr("class", "evolutionLmmLine").attr("fill", "none");
        return group;
      },
      (update) => update,
      (exit) => exit.remove(),
    )
    .classed("hide", (entry) => hide.includes(entry.group));

  lmmLines.each(function (entry) {
    const validValues = (entry.values || []).filter((point) =>
      Number.isFinite(Number(point.fit)),
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
          Intercept reference: ${data?.lmm?.selectedGroup ?? "All"}<br/>
          Slope (time): ${formatSlope(slope)} (${slopeDirection})<br/>
          Wald p: ${formatP(pValue)}<br/>
          Δ first→last: ${formatSlope(delta, 3)} (${trendLabel})
        `;
        tooltip.style("opacity", 1).html(html);
      })
      .on("mousemove", function (event) {
        moveTooltip(event, tooltip, chart);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });
  });
}
