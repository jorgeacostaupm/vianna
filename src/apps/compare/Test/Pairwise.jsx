import React, { useRef, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import * as d3 from "d3";

import ChartBar from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";
import {
  moveTooltip,
  computePairwiseData,
  formatDecimal,
} from "@/utils/functions";
import { ORDER_VARIABLE } from "@/utils/Constants";
import useResizeObserver from "@/hooks/useResizeObserver";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import { notifyError, notifyInfo } from "@/utils/notifications";
import { Settings } from "./PointRange";
import {
  CHART_GRID,
  CHART_OUTLINE,
} from "@/utils/chartTheme";
import { attachTickLabelGridHover, paintLayersInOrder } from "@/utils/gridInteractions";
import {
  extractOrderValues,
  isFiniteNumericValue,
  uniqueColumns,
} from "@/utils/viewRecords";

export default function Pairwise({
  id,
  variable,
  test,
  remove,
  sourceOrderValues = [],
}) {
  const ref = useRef();
  const dims = useResizeObserver(ref);

  const selection = useSelector((s) => s.dataframe.present.selection);
  const groupVar = useSelector((s) => s.compare.groupVar);
  const attributes = useSelector((s) => s.metadata.attributes);

  const [config, setConfig] = useState({
    isSync: true,
    showCaps: true,
    capSize: 3,
    markerShape: "circle",
    markerSize: 5,
    positiveOnly: true,
    sortDescending: true,
  });

  const [data, setData] = useState(null);

  const liveOrderValues = React.useMemo(
    () =>
      extractOrderValues(selection, (row) => {
        const groupValue = row?.[groupVar];
        const value = row?.[variable];
        return groupValue != null && isFiniteNumericValue(value);
      }),
    [selection, groupVar, variable],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = React.useMemo(
    () => uniqueColumns([groupVar, variable, ORDER_VARIABLE]),
    [groupVar, variable],
  );

  useEffect(() => {
    if (!variable || !test || !groupVar) {
      setData(null);
      return;
    }
    if (!config.isSync) return;

    try {
      const tmp = computePairwiseData(selection, groupVar, variable, test);
      if (!tmp?.pairwiseEffects || tmp.pairwiseEffects.length === 0) {
        notifyInfo({
          message: "No pairwise effects available",
          description: "The selected test does not provide pairwise effects.",
          placement: "bottomRight",
          source: "test",
        });
        setData(null);
        return;
      }
      setData(tmp);
    } catch (error) {
      notifyError({
        message: "Could not compute pairwise effects",
        error,
        fallback: "Pairwise effect calculation failed.",
        placement: "bottomRight",
        source: "test",
      });
    }
  }, [variable, test, selection, groupVar, config.isSync]);

  useEffect(() => {
    if (data && dims) {
      return renderPairwisePlot(ref.current, data, config, dims, id);
    }
    if (dims) {
      d3.select(ref.current).selectAll("*").remove();
    }
  }, [data, dims, config]);

  const infoContent =
    data?.descriptionJSX ||
    data?.shortDescription ||
    data?.referenceUrl ||
    data?.applicability ||
    (Array.isArray(data?.reportedMeasures) && data.reportedMeasures.length > 0) ||
    data?.postHoc ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {data?.shortDescription && <div>{data.shortDescription}</div>}
        {data?.applicability && (
          <div>
            <b>Applies to:</b> {data.applicability}
          </div>
        )}
        {Array.isArray(data?.reportedMeasures) &&
          data.reportedMeasures.length > 0 && (
            <div>
              <b>Reported measures:</b>
              <ul style={{ margin: "4px 0 0", paddingLeft: "1.1em" }}>
                {data.reportedMeasures.map((measure) => (
                  <li key={measure}>{measure}</li>
                ))}
              </ul>
            </div>
          )}
        {data?.postHoc && (
          <div>
            <b>Post hoc:</b> {data.postHoc}
          </div>
        )}
        {data?.referenceUrl && (
          <a
            href={data.referenceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            Reference
          </a>
        )}
        {data?.descriptionJSX && <div>{data.descriptionJSX}</div>}
      </div>
    ) : null;

  const pairwiseLabel = data?.pairwiseTitle || "Effect sizes";
  const title = [test, pairwiseLabel, variable].filter(Boolean).join(" · ");
  const variableDescription = React.useMemo(() => {
    const description = attributes?.find((attr) => attr?.name === variable)?.desc;
    return typeof description === "string" ? description.trim() : "";
  }, [attributes, variable]);

  return (
    <div className={styles.viewContainer} data-view-container>
      <ChartBar
        title={title}
        hoverTitle={variableDescription || undefined}
        info={infoContent}
        svgIDs={[id]}
        remove={remove}
        config={config}
        setConfig={setConfig}
        settings={
          <Settings config={config} setConfig={setConfig} variant="pairwise" />
        }
        recordsExport={{
          filename: `pairwise_${variable || "view"}`,
          recordOrders,
          requiredVariables,
        }}
      ></ChartBar>

      <div ref={ref} className={styles.chartContainer}></div>
    </div>
  );
}

function renderPairwisePlot(container, result, config, dimensions, id) {
  const {
    showCaps,
    capSize,
    markerShape,
    markerSize,
    positiveOnly,
    sortDescending,
  } = config;
  let data = result.pairwiseEffects.map((d) => ({
    ...d,
    groups: [...d.groups],
    ci95: { ...d.ci95 },
  }));

  if (positiveOnly) {
    data = data.map((d) => {
      if (d.value < 0) {
        return {
          ...d,
          value: -d.value,
          groups: [...d.groups].reverse(),
          ci95: { lower: -d.ci95.upper, upper: -d.ci95.lower },
        };
      }
      return d;
    });
  }

  data.sort((a, b) =>
    sortDescending ? b.value - a.value : a.value - b.value
  );

  const labels = data.map((d) => d.groups.join(" vs "));

  const margin = { top: 20, right: 50, bottom: 50, left: 160 };
  const totalWidth = dimensions.width;
  const totalHeight = dimensions.height;
  const chartWidth = totalWidth - margin.left - margin.right;
  const chartHeight = totalHeight - margin.top - margin.bottom;

  d3.select(container).selectAll("*").remove();

  let tooltip = d3.select("body").select("div.tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div").attr("class", "tooltip");
  }

  const svg = d3
    .select(container)
    .append("svg")
    .attr("id", id)
    .attr("width", "100%")
    .attr("height", "100%")
    .style("display", "block")
    .attr("class", styles.chartSvg);

  if (totalHeight > chartHeight + margin.top + margin.bottom) {
    svg.style("position", "absolute").style("bottom", 0).style("left", 0);
  }

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .style("font-size", "16px");

  const rawLower = Math.min(
    d3.min(data, (d) => d.ci95.lower),
    0,
  );
  const rawUpper = d3.max(data, (d) => d.ci95.upper);
  const x = d3
    .scaleLinear()
    .domain([rawLower, rawUpper])
    .nice()
    .range([0, chartWidth]);
  const y = d3.scaleBand().domain(labels).range([0, chartHeight]).padding(0.2);

  const yAxisG = chart.append("g").call(d3.axisLeft(y));
  yAxisG.select(".domain").remove();
  yAxisG.selectAll(".tick line").remove();
  yAxisG
    .selectAll("text")
    .each(function () {
      const textEl = d3.select(this);
      const fullText = textEl.text();

      if (this.getComputedTextLength() > margin.left - 20) {
        let truncated = fullText;
        while (
          this.getComputedTextLength() > margin.left - 20 &&
          truncated.length > 0
        ) {
          truncated = truncated.slice(0, -1);
          textEl.text(truncated + "…");
        }
        textEl.append("title").text(fullText);
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
  xGridG
    .selectAll(".tick line")
    .attr("stroke", CHART_GRID);

  const formatPValueLines = (d) => {
    const adjustedLabel = d?.pAdjustMethod
      ? `p-value (${d.pAdjustMethod}): ${formatDecimal(d.pValue)}`
      : `p-value: ${formatDecimal(d.pValue)}`;
    const rawLine =
      d?.pAdjustMethod && Number.isFinite(d?.pValueRaw)
        ? `<br/>raw p-value: ${formatDecimal(d.pValueRaw)}`
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
    .attr("x1", (d) => x(d.ci95.lower))
    .attr("x2", (d) => x(d.ci95.upper))
    .attr("y1", (_, i) => y(labels[i]) + y.bandwidth() / 2)
    .attr("y2", (_, i) => y(labels[i]) + y.bandwidth() / 2)
    .on("mouseover", (event, d) => {
      tooltip
        .html(
          `<strong>${d.groups.join(" vs ")}</strong><br/>
           ${d.measure}: ${d.value.toFixed(2)}<br/>
           CI: [${d.ci95.lower.toFixed(2)}, ${d.ci95.upper.toFixed(2)}]<br/>
           ${formatPValueLines(d)}`,
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
      .attr("x1", (d) => x(d.ci95.lower))
      .attr("x2", (d) => x(d.ci95.lower))
      .attr("y1", (_, i) => y(labels[i]) + y.bandwidth() / 2 - capSize)
      .attr("y2", (_, i) => y(labels[i]) + y.bandwidth() / 2 + capSize);

    chart
      .selectAll(".cap-right")
      .data(data)
      .join("line")
      .attr("class", "cap-right")
      .attr("stroke", CHART_OUTLINE)
      .attr("stroke-width", 1.6)
      .attr("x1", (d) => x(d.ci95.upper))
      .attr("x2", (d) => x(d.ci95.upper))
      .attr("y1", (_, i) => y(labels[i]) + y.bandwidth() / 2 - capSize)
      .attr("y2", (_, i) => y(labels[i]) + y.bandwidth() / 2 + capSize);
  }

  if (markerShape === "circle") {
    chart
      .selectAll(".effect-point")
      .data(data)
      .join("circle")
      .attr("class", "effect-point")
      .attr("cx", (d) => x(d.value))
      .attr("cy", (_, i) => y(labels[i]) + y.bandwidth() / 2)
      .attr("r", markerSize)
      .attr("fill", "var(--chart-focus)");
  } else {
    const symbolType =
      markerShape === "square" ? d3.symbolSquare : d3.symbolDiamond;
    const symbolGen = d3
      .symbol()
      .type(symbolType)
      .size(markerSize * markerSize * 4);
    chart
      .selectAll(".effect-point")
      .data(data)
      .join("path")
      .attr("class", "effect-point")
      .attr("d", symbolGen)
      .attr("fill", "var(--chart-focus)")
      .attr("transform", (_, i) => {
        const d = data[i];
        return `translate(${x(d.value)},${y(labels[i]) + y.bandwidth() / 2})`;
      });
  }

  chart
    .selectAll(".effect-point")
    .on("mouseover", (event, d) => {
      tooltip
        .html(
          `<strong>${d.groups.join(" vs ")}</strong><br/>
           ${d.measure}: ${d.value.toFixed(2)}<br/>
           CI: [${d.ci95.lower.toFixed(2)}, ${d.ci95.upper.toFixed(2)}]<br/>
           ${formatPValueLines(d)}`,
        )
        .style("visibility", "visible");
    })
    .on("mousemove", (event) => moveTooltip(event, tooltip, chart))
    .on("mouseout", () => tooltip.style("visibility", "hidden"));

  attachTickLabelGridHover({
    axisGroup: xAxisG,
    gridGroup: xGridG,
  });

  paintLayersInOrder({
    chartGroup: chart,
    layers: [yAxisG, xAxisG, xGridG],
  });
}
