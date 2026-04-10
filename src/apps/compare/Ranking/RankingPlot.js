import * as d3 from "d3";
import store from "@/store/store";
import { formatDecimal, moveTooltip } from "@/utils/functions";
import { CHART_GRID } from "@/utils/chartTheme";
import {
  attachTickLabelGridHover,
  paintLayersInOrder,
} from "@/utils/gridInteractions";

export default class RankingPlot {
  constructor(parent) {
    this.parent = parent;
    this.margin = { top: 50, right: 30, bottom: 60, left: 90 };
    this.nBars = 15;
    this.pValue = 0.05;
    this.desc = true;
    this.filterList = [];
    this.xAccesor = (d) => d.variable;
    this.yAccesor = (d) => Math.abs(+d.value);
    this.selectedVar = null;
    this.onVariableClick = null;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.svg = d3.select(vis.parent);

    vis.chart = vis.svg
      .append("g")
      .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);

    vis.tooltip = d3.select("body").select("div.tooltip");
    if (vis.tooltip?.empty()) {
      vis.tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }
    vis.descTooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip descTooltip");
    vis.xAxisG = vis.chart.append("g").attr("class", "x-axis");
    vis.yAxisG = vis.chart.append("g").attr("class", "y-axis");

    const dimensions = vis.parent.getBoundingClientRect();
    vis.setSize(dimensions);
  }

  setSize(dimensions) {
    let vis = this;
    const { width, height } = dimensions;
    vis.width = width - vis.margin.left - vis.margin.right;
    vis.height = height - vis.margin.top - vis.margin.bottom;
    vis.xAxisG.attr("transform", `translate(0, ${vis.height})`);
  }

  onResize(dimensions) {
    let vis = this;
    vis.setSize(dimensions);
    vis.updateVis();
  }

  renderNoData() {
    const vis = this;
    const xAxisGroup = vis.xAxisG;
    const yAxisGroup = vis.yAxisG;

    vis.chart.selectAll("*").remove();

    vis.chart.append(() => xAxisGroup.node());
    vis.chart.append(() => yAxisGroup.node());
  }

  updateVis() {
    let vis = this;

    if (vis.data.length === 0) {
      vis.renderNoData();
      return;
    }

    vis.data = vis.data.filter(
      (d) =>
        !vis.config.filterList.includes(d.variable) &&
        d.pValue < vis.config.pValue
    );

    vis.descriptions = store.getState().main.descriptions;

    vis.data.sort((b, a) => {
      return vis.config.desc
        ? asc(a, b, vis.yAccesor)
        : desc(a, b, vis.yAccesor);
    });

    vis.filteredData = vis.data.slice(0, vis.config.nBars);

    const all_values = vis.filteredData.map((d) => Math.abs(+d.value));
    const y_max = Math.max(...all_values);

    vis.x_scale = d3
      .scaleBand()
      .range([0, vis.width])
      .domain(vis.filteredData.map((d) => vis.xAccesor(d)))
      .padding(0.2);

    vis.y_scale = d3
      .scaleLinear()
      .domain([0, y_max])
      .range([vis.height, 0])
      .nice();

    vis.selectedBar = null;

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart
      .selectAll(".bar")
      .data(vis.filteredData)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => vis.x_scale(vis.xAccesor(d)))
      .attr("y", (d) => vis.y_scale(vis.yAccesor(d)))
      .attr("width", vis.x_scale.bandwidth())
      .attr("height", (d) => vis.height - vis.y_scale(vis.yAccesor(d)))
      .attr("fill", "var(--primary-color)")
      .style("cursor", "pointer")
      .on("click", function (_, d) {
        vis.selectedVar = d.variable;
        vis.selectedBar = d3.select(this);
        vis.chart
          .selectAll(".bar")
          .classed("selected", (item) => item.variable === vis.selectedVar);

        if (typeof vis.onVariableClick === "function") {
          vis.onVariableClick(d.variable);
        }
      })
      .on("mouseover", function (e, d) {
        vis.tooltip.style("visibility", "visible").html(
          `<strong>${vis.xAccesor(d)} </strong> <br>
          ${vis.measure}: ${vis.yAccesor(d).toFixed(3)} <br>
          p-value: ${formatDecimal(d.p_value)} `
        );
      })
      .on("mousemove", function (e) {
        moveTooltip(e, vis.tooltip, vis.chart);
      })
      .on("mouseout", function () {
        vis.tooltip.style("visibility", "hidden");
      });

    vis.chart.selectAll(".bar").classed("selected", function (d) {
      if (d.variable === vis.selectedVar) vis.selectedBar = d3.select(this);
      return d.variable === vis.selectedVar;
    });

    vis.chart
      .selectAll(".yAxisLabel")
      .data([null])
      .join("text")
      .attr("class", "yAxisLabel")
      .attr("transform", `translate(-0,${-15})rotate(0)`)
      .attr("text-anchor", "middle")
      .text(vis.config.measure);

    vis.xAxisG
      .call(d3.axisBottom(vis.x_scale).tickSize(0))
      .selectAll("text")
      .attr("transform", "translate(0,0)rotate(-15)")
      .style("text-anchor", "end");
    vis.xAxisG.select(".domain").remove();
    vis.xAxisG.selectAll(".tick line").remove();

    vis.xAxisG
      .selectAll(".tick")
      /*       .on("click", (e, d) => {
        if (d === vis.selectedVar) store.dispatch(setSelectedVar(null));
        store.dispatch(vis.addFilteringVariable(d));
      }) */
      .on("mouseover", function (e, d) {
        const description = vis.filteredData.find(
          (item) => item.variable === d
        )?.desc;

        vis.descTooltip
          .style("opacity", 1)
          .html(`${d}: ${description ? description : "-"} `);
      })
      .on("mousemove", function (e) {
        moveTooltip(e, vis.descTooltip, vis.chart);
      })
      .on("mouseout", function () {
        vis.descTooltip.style("opacity", 0);
      });

    const yAxis = d3.axisLeft(vis.y_scale).ticks(4);
    if (vis.config.showGrid) {
      yAxis.tickSize(-vis.width);
    }
    vis.yAxisG.call(yAxis);
    vis.yAxisG.select(".domain").remove();
    if (vis.config.showGrid) {
      vis.yAxisG
        .selectAll(".tick line")
        .attr("stroke", CHART_GRID);

      attachTickLabelGridHover({
        axisGroup: vis.yAxisG,
        gridGroup: vis.yAxisG,
        lineSelector: "line",
        includeTick: () => true,
      });

    } else {
      vis.yAxisG
        .selectAll(".tick line")
        .remove();
      vis.yAxisG
        .selectAll(".tick text")
        .on("mouseover.grid-line-highlight", null)
        .on("mouseout.grid-line-highlight", null);
    }

    paintLayersInOrder({
      chartGroup: vis.chart,
      layers: [vis.xAxisG, vis.yAxisG],
    });
  }
}

function asc(a, b, accesor) {
  return Math.abs(accesor(a)) - Math.abs(accesor(b));
}

function desc(a, b, accesor) {
  return Math.abs(accesor(b)) - Math.abs(accesor(a));
}
