import * as d3 from "d3";
import { CHART_OUTLINE, CHART_OUTLINE_MUTED } from "@/utils/chartTheme";

import { transitionDuration } from "./constants";
import { colorNode } from "./helpers";

export function drawHierarchy(source, instant = false) {
  const { root } = this;
  const siblingSpacing = this.viewConfig.nodeSize;
  const treeLayout = d3.tree().nodeSize([siblingSpacing, siblingSpacing]);
  treeLayout(root);

  root.descendants().forEach((node) => {
    node.y = node.depth * this.viewConfig.depthSpacing;
  });

  this.drawNodes(source, instant);
  this.drawLinks(source, instant);

  root.each((d) => {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

export function drawNodes(source, instant = false) {
  const { root, main } = this;
  const graph = this;
  const transitionTime = instant ? 0 : transitionDuration;

  const nodes = root.descendants();

  const dragBehaviour = this.getDragBehaviour();

  const gnode = main
    .select("#nodes")
    .selectAll(".circleG")
    .data(nodes, (d) => d.id)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", "circleG")
          .attr("transform", () => this.getNodeTransform(source, true))
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0);

        this.addNodeEvents(g);

        g.call(dragBehaviour);

        g.each(function (d) {
          const group = d3.select(this);
          const { type } = d.data;
          const nChildren =
            (d.children?.length ?? 0) + (d._children?.length ?? 0);
          const fill = colorNode(d);
          const halfSize = graph.getNodeHalfSize();

          if (type === "aggregation" && nChildren === 0) {
            group
              .append("path")
              .attr("class", "showCircle")
              .attr("d", graph.getNodeTrianglePath())
              .attr("fill", fill);
          } else if (type === "aggregation" || type === "root") {
            group
              .append("rect")
              .attr("class", "showCircle")
              .attr("x", -halfSize)
              .attr("y", -halfSize)
              .attr("width", halfSize * 2)
              .attr("height", halfSize * 2)
              .attr("rx", graph.getNodeCornerRadius())
              .attr("fill", fill);
          } else {
            group
              .append("circle")
              .attr("class", "showCircle")
              .attr("r", halfSize)
              .attr("fill", fill);
          }

          if (d._children && !d.children) {
            group
              .select(".showCircle")
              .attr("stroke", CHART_OUTLINE)
              .attr("stroke-width", 2 * graph.viewConfig.nodeScale);
          }
        });

        g.append("circle")
          .attr("class", "ghostCircle")
          .attr("r", this.getAssignRadius())
          .attr("opacity", 0.2)
          .attr("fill", "var(--color-brand)")
          .attr("fill-opacity", 0)
          .attr("pointer-events", "all")
          .on("mouseover", function (event, node) {
            if (
              graph.nodesDragged.length > 0 &&
              graph.nodesDragged.filter((n) => n.id !== node.id).length ===
                graph.nodesDragged.length
            ) {
              d3.select(this).attr("fill-opacity", 0.5);
              graph.targetNode = node;
            }
          })
          .on("mouseout", function (event, node) {
            if (
              graph.nodesDragged.length &&
              !graph.nodesDragged.some((n) => n.id === node.id)
            ) {
              graph.targetNode = null;
            }
            d3.select(this).attr("fill-opacity", 0);
          });

        g.append("text")
          .attr("dy", "0.3em")
          .attr("x", 0)
          .attr("y", this.getLabelOffset())
          .attr("text-anchor", "middle")
          .style("font-size", `${Math.round(this.viewConfig.labelFontSize)}px`)
          .text((node) => graph.getLabelText(node))
          .style("fill", "var(--color-ink)")
          .style("stroke", "var(--color-surface)")
          .style("stroke-width", 3)
          .style("stroke-linejoin", "round")
          .style("paint-order", "stroke");

        return g;
      },
      (update) => update,
      (exit) =>
        exit
          .transition()
          .duration(transitionTime)
          .attr("transform", () => this.getNodeTransform(source))
          .attr("fill-opacity", 0)
          .attr("stroke-opacity", 0)
          .remove(),
    );

  const currentNodeHalfSize = this.getNodeHalfSize();
  const currentCornerRadius = this.getNodeCornerRadius();

  gnode.selectAll("circle.showCircle").attr("r", currentNodeHalfSize);
  gnode
    .selectAll("rect.showCircle")
    .attr("x", -currentNodeHalfSize)
    .attr("y", -currentNodeHalfSize)
    .attr("width", currentNodeHalfSize * 2)
    .attr("height", currentNodeHalfSize * 2)
    .attr("rx", currentCornerRadius);
  gnode.selectAll("path.showCircle").attr("d", this.getNodeTrianglePath());
  gnode.selectAll(".ghostCircle").attr("r", this.getAssignRadius());

  gnode
    .select(".showCircle")
    .attr("fill", (d) => colorNode(d))
    .attr("fill-opacity", (d) => (d.data?.isActive === false ? 0.55 : 1))
    .attr("stroke", (d) => {
      return (d._children && !d.children) || d.data?.type === "root" || d.data?.id === 0
        ? CHART_OUTLINE
        : "none";
    })
    .attr("stroke-width", 2 * this.viewConfig.nodeScale);

  gnode
    .transition()
    .duration(transitionTime)
    .attr("transform", (d) => this.getNodeTransform(d))
    .attr("fill-opacity", 1)
    .attr("stroke-opacity", 1);

  const isHorizontal = this.isHorizontal();

  gnode
    .select("text")
    .text((d) => this.getLabelText(d))
    .attr("x", 0)
    .attr("y", this.getLabelOffset())
    .attr("text-anchor", isHorizontal ? "middle" : "start")
    .attr("transform", isHorizontal ? null : "rotate(-25)")
    .style("font-size", `${Math.round(this.viewConfig.labelFontSize)}px`)
    .attr("stroke", "var(--color-surface)")
    .attr("display", this.viewConfig.showLabels ? null : "none")
    .style("fill", (d) =>
      d.data?.isActive === false
        ? "var(--color-ink-tertiary)"
        : "var(--color-ink)",
    )
    .attr("text-decoration", (d) =>
      d.data?.isActive === false ? "line-through" : null,
    );
}

export function drawLinks(source, instant = false) {
  const { root, main } = this;
  const links = root.links();

  const glink = main
    .select("#links")
    .selectAll("path")
    .data(links, (link) => link.target.id);

  const enterLinks = glink
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("stroke", CHART_OUTLINE_MUTED)
    .attr("stroke-opacity", 1)
    .attr("stroke-width", this.viewConfig.linkWidth)
    .attr("d", () => {
      const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
      return this.getLinkPath({ source: o, target: o });
    });

  glink
    .merge(enterLinks)
    .attr("stroke-width", this.viewConfig.linkWidth)
    .transition()
    .duration(instant ? 0 : transitionDuration)
    .attr("d", (d) => this.getLinkPath(d));

  glink
    .exit()
    .transition()
    .duration(instant ? 0 : transitionDuration)
    .attr("d", () => {
      const o = { x: source.x, y: source.y };
      return this.getLinkPath({ source: o, target: o });
    })
    .remove();
}
