import * as d3 from "d3";
import { useEffect, useMemo, useState } from "react";
import { moveTooltip } from "@/utils/functions";
import useResizeObserver from "@/hooks/useResizeObserver";
import { useSelector } from "react-redux";
import useGroupColorDomain from "@/hooks/useGroupColorDomain";
import renderLegend from "@/utils/renderLegend";
import { CHART_HIGHLIGHT } from "@/utils/chartTheme";
import { attachTickLabelGridHover } from "@/utils/gridInteractions";

const margin = { top: 60, right: 60, bottom: 60, left: 85 };

let brushCell = null;
let brushInstance = null;

export default function useScatter({ chartRef, legendRef, data, config }) {
  const idVar = useSelector((s) => s.main.idVar);
  const dimensions = useResizeObserver(chartRef);
  const [hide, setHide] = useState([]);
  const [hoverHiddenGroups, setHoverHiddenGroups] = useState([]);
  const [blur, setBlur] = useState([]);
  const [scatter, setScatter] = useState(null);
  const groupVar = config?.groupVar;
  const groupsInData = useMemo(
    () =>
      Array.isArray(data) && groupVar
        ? Array.from(new Set(data.map((d) => d[groupVar]))).filter(
            (value) => value != null
          )
        : [],
    [data, groupVar]
  );
  const { colorDomain, orderedGroups: groups } = useGroupColorDomain(
    groupVar,
    groupsInData
  );

  useEffect(() => {
    const { groupVar, pointSize, variables, pointOpacity, showLegend } = config;
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

    if (
      !groupVar ||
      !dimensions ||
      !data ||
      !chartRef.current ||
      !legendRef.current
    ) {
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

    let tooltip = d3.select("body").select("div.tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    const svg = d3.select(chartRef.current);
    const legend = d3.select(legendRef.current);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const position = d3
      .scaleBand()
      .domain(variables)
      .paddingInner(0.1)
      .range([0, chartSize]);

    const color = d3.scaleOrdinal().domain(colorDomain).range(colorScheme);

    if (showLegend !== false) {
      renderLegend(legend, groups, color, blur, setBlur, hide, setHide, null, null, {
        transientHide: hoverHiddenGroups,
        setTransientHide: setHoverHiddenGroups,
      });
    }

    if (variables.length < 2) return;

    if (scatter === null) {
      for (let i in variables) {
        for (let j in variables) {
          let x = variables[i];
          let y = variables[j];

          if (x === y) {
            renderText(x, y);
          } else {
            renderScatter(x, y);
          }
        }
      }
    } else {
      renderBigScatter(scatter);
    }

    function renderText(x, y) {
      chart
        .append("g")
        .attr(
          "transform",
          `translate(${position(x) + position.bandwidth() / 2}, ${
            position(y) + position.bandwidth() / 2
          })`
        )
        .append("text")
        .attr("class", "sc-label")
        .attr("id", x)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(x);
    }

    function renderScatter(var1, var2) {
      let xextent = d3.extent(data, function (d) {
        return +d[var1];
      });
      let x = d3
        .scaleLinear()
        .domain(xextent)
        .nice()
        .range([0, position.bandwidth()]);

      let yextent = d3.extent(data, function (d) {
        return +d[var2];
      });
      let y = d3
        .scaleLinear()
        .domain(yextent)
        .nice()
        .range([position.bandwidth(), 0]);

      let gCell = chart
        .append("g")
        .attr("transform", `translate(${position(var1)},${position(var2)})`)
        .attr("class", "cell");

      gCell
        .append("rect")
        .attr("var1", var1)
        .attr("var2", var2)
        .attr("id", var1 + var2)
        .attr("class", "rect-cell")
        .attr("width", position.bandwidth())
        .attr("height", position.bandwidth())
        .attr("fill", "transparent")
        .attr("stroke", "var(--chart-border-strong)")
        .attr("stroke-width", 1);

      const dots = gCell.selectAll(".dots").data(data);

      dots
        .enter()
        .append("circle")
        .attr("class", (d) => "dots " + "group" + d[groupVar])
        .attr("r", pointSize)
        .attr("fill", function (d) {
          return color(d[groupVar]);
        })
        .attr("opacity", pointOpacity ?? 0.8)
        .merge(dots)
        .attr("cx", function (d) {
          return x(+d[var1]);
        })
        .attr("cy", function (d) {
          return y(+d[var2]);
        });

      dots
        .attr("cx", function (d) {
          return x(+d[var1]);
        })
        .attr("cy", function (d) {
          return y(+d[var2]);
        });

      dots.exit().remove();

      renderScatterAxis(gCell, var1, var2, x, y);

      let brush = addBrush(var1, var2, x, y);
      gCell.call(brush);

      gCell.on("mousedown", (e) => {
        if (e.ctrlKey) {
          e.stopImmediatePropagation();
          const tmp = { var1, var2 };
          setScatter(tmp);
        }
      });
    }

    function renderScatterAxis(gCell, var1, var2, x, y) {
      const n_ticks = 3;
      const variables = position.domain();
      if (variables.indexOf(var1) == 0) {
        const axisG = gCell
          .append("g")
          .style("color", "var(--chart-axis)")
          .call(d3.axisLeft(y).ticks(n_ticks))
          .call((g) => {
            const columnIndex = variables.indexOf(var2);
            const bandWidth = position.bandwidth();
            const innerPadding = position.paddingInner();

            const x2Value =
              bandWidth * (columnIndex + innerPadding * (columnIndex - 1));

            g.selectAll(".tick line")
              .clone()
              .classed("chart-grid-line", true)
              .attr("x2", x2Value + 1 * (columnIndex - 1))
              .attr("stroke-opacity", 0.1);
            g.selectAll(".domain").remove();
            g.attr("transform", `translate(0,-0.5)`);
          });
        attachTickLabelGridHover({
          axisGroup: axisG,
          gridGroup: axisG,
          lineSelector: "line.chart-grid-line",
        });
      }

      if (variables.indexOf(var2) == 0) {
        const axisG = gCell
          .append("g")
          .style("color", "var(--chart-axis)")
          .call(d3.axisTop(x).ticks(n_ticks))
          .call((g) => {
            g.selectAll(".tick line").attr("y2", -6);
            g.selectAll(".domain").remove();
          })
          .call((g) => {
            const columnIndex = variables.indexOf(var1);
            const bandWidth = position.bandwidth();
            const innerPadding = position.paddingInner();

            const y2Value =
              bandWidth * (columnIndex + innerPadding * (columnIndex - 1));

            g.selectAll(".tick line")
              .clone()
              .classed("chart-grid-line", true)
              .attr("y2", y2Value + 1 * (columnIndex - 1))
              .attr("stroke-opacity", 0.1);
          });
        attachTickLabelGridHover({
          axisGroup: axisG,
          gridGroup: axisG,
          lineSelector: "line.chart-grid-line",
        });
      }

      if (variables.indexOf(var1) == variables.length - 1) {
        const axisG = gCell
          .append("g")
          .style("color", "var(--chart-axis)")
          .attr("transform", `translate(${position.bandwidth()},-0.5)`)
          .call(d3.axisRight(y).ticks(n_ticks))
          .call((g) => {
            g.selectAll(".tick line").attr("x2", 6);
            g.selectAll(".domain").remove();
          })
          .call((g) => {
            const columnIndex = variables.length - variables.indexOf(var2) - 1;
            const bandWidth = position.bandwidth();
            const innerPadding = position.paddingInner();

            const x2Value =
              bandWidth * (columnIndex + innerPadding * (columnIndex - 1));

            g.selectAll(".tick line")
              .clone()
              .classed("chart-grid-line", true)
              .attr("x2", -x2Value - 1 * (columnIndex - 1))
              .attr("stroke-opacity", 0.1);
          });
        attachTickLabelGridHover({
          axisGroup: axisG,
          gridGroup: axisG,
          lineSelector: "line.chart-grid-line",
        });
      }

      if (variables.indexOf(var2) == variables.length - 1) {
        const axisG = gCell
          .append("g")
          .attr("transform", `translate(-0.5,${position.bandwidth()})`)
          .style("color", "var(--chart-axis)")
          .call(d3.axisBottom(x).ticks(n_ticks))
          .call((g) => {
            const columnIndex = variables.length - variables.indexOf(var1) - 1;
            const bandWidth = position.bandwidth();
            const innerPadding = position.paddingInner();

            const y2Value =
              bandWidth * (columnIndex + innerPadding * (columnIndex - 1));

            g.selectAll(".tick line")
              .clone()
              .classed("chart-grid-line", true)
              .attr("y2", -y2Value - 1 * (columnIndex - 1))
              .attr("stroke-opacity", 0.1);

            g.selectAll(".domain").remove();
          });
        attachTickLabelGridHover({
          axisGroup: axisG,
          gridGroup: axisG,
          lineSelector: "line.chart-grid-line",
        });
      }
    }

    function renderBigScatter(scatter) {
      chart.selectAll("*").remove();

      const { var1, var2 } = scatter;
      const xextent = d3.extent(data, (d) => +d[var1]);
      const x = d3.scaleLinear().domain(xextent).nice().range([0, chartSize]);
      const yextent = d3.extent(data, (d) => +d[var2]);
      const y = d3.scaleLinear().domain(yextent).nice().range([chartSize, 0]);

      chart
        .append("rect")
        .attr("width", chartSize)
        .attr("height", chartSize)
        .attr("fill", "transparent")
        .on("click", function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (e.ctrlKey) {
            setScatter(null);
          }
        });

      chart
        .selectAll(".dots")
        .data(data)
        .join("circle")
        .attr("class", "dots")
        .attr("cx", (d) => x(+d[var1]))
        .attr("cy", (d) => y(+d[var2]))
        .attr("r", pointSize)
        .attr("fill", (d) => color(d[groupVar]))
        .attr("opacity", pointOpacity ?? 0.8)
        .on("mouseover", function (e, d) {
          const target = e.target;
          d3.select(target).style("stroke", CHART_HIGHLIGHT).raise();
          let html = `<strong>${d[groupVar]}</strong> <br>`;
          html += `${var1}: ${d[var1]?.toFixed(2)} <br> ${var2}: ${d[
            var2
          ]?.toFixed(2)} <br>`;
          html += d[idVar] ? `${idVar} : ${d[idVar]}<br>` : "";
          tooltip.style("opacity", 1).html(html);
        })
        .on("mousemove", function (e) {
          moveTooltip(e, tooltip, chart);
        })
        .on("mouseout", function (e) {
          const target = e.target;
          d3.select(target).style("stroke", null);
          tooltip.style("opacity", 0);
        });

      chart
        .append("g")
        .attr("transform", `translate(0, ${chartSize})`)
        .style("color", "var(--chart-axis)")
        .call(d3.axisBottom(x).ticks(3));

      chart
        .append("g")
        .attr("transform", `translate(0, 0)`)
        .style("color", "var(--chart-axis)")
        .call(d3.axisLeft(y).ticks(3));

      chart
        .selectAll(".yAxisLabel")
        .data([null])
        .join("text")
        .attr("class", "yAxisLabel")
        .attr("transform", `translate(0, ${-20})`)
        .attr("text-anchor", "middle")
        .style("font-size", "var(--axis-label-font-size, 16px)")
        .text(var2);

      chart
        .selectAll(".xAxisLabel")
        .data([null])
        .join("text")
        .attr("class", "xAxisLabel")
        .attr("transform", `translate(${chartSize + 10}, ${chartSize + 5})`)
        .attr("text-anchor", "start")
        .style("font-size", "var(--axis-label-font-size, 16px)")
        .text(var1);
    }

    function addBrush(var1, var2, x, y) {
      if (brushInstance && brushCell) {
        d3.select(brushCell).call(brushInstance.move, null);
        d3.select(brushCell).select(".brush").remove();
        brushCell = null;
      }

      brushInstance = d3
        .brush()
        .extent([
          [0, 0],
          [position.bandwidth(), position.bandwidth()],
        ])
        .on("start", brushstarted)
        .on("brush", brushing)
        .on("end", brushended);

      function brushstarted() {
        if (brushCell !== this) {
          d3.select(brushCell).call(brushInstance.move, null);
          brushCell = this;
        }
      }

      function brushing({ selection }) {
        if (!selection) return;
        const x0 = x.invert(selection[0][0]),
          y1 = y.invert(selection[0][1]),
          x1 = x.invert(selection[1][0]),
          y0 = y.invert(selection[1][1]);

        chart
          .selectAll(".dots")
          .classed("hiddenDot", (d) => {
            const isBrushed =
              d[var1] > x0 && d[var1] < x1 && d[var2] > y0 && d[var2] < y1;
            return !isBrushed;
          })
          .filter((d) => {
            const isBrushed =
              d[var1] > x0 && d[var1] < x1 && d[var2] > y0 && d[var2] < y1;
            return isBrushed;
          })
          .raise();
      }

      function brushended({ selection }) {
        if (!selection) {
          chart.selectAll(".dots").classed("hiddenDot", false);
        } else {
          chart.selectAll(".overlay").raise();
          chart.selectAll(".selection").raise();
        }
      }

      return brushInstance;
    }
  }, [
    data,
    config.variables,
    config.groupVar,
    config.showLegend,
    dimensions,
    scatter,
    colorDomain,
    groups,
  ]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = d3.select(chartRef.current);
    const hiddenSet = new Set([...(hide || []), ...(hoverHiddenGroups || [])]);
    chart
      .selectAll(".dots")
      .classed("hide", (d) => hiddenSet.has(d[config.groupVar]))
      .classed("blur", (d) => blur.includes(d[config.groupVar]));
  }, [hide, hoverHiddenGroups, blur, config.groupVar]);

  useEffect(() => {
    setHide([]);
    setHoverHiddenGroups([]);
    setBlur([]);
  }, [config.groupVar]);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = d3.select(chartRef.current);
    chart
      .selectAll(".dots")
      .attr("r", config.pointSize)
      .attr("opacity", config.pointOpacity);
  }, [config.pointSize, config.pointOpacity]);
}
