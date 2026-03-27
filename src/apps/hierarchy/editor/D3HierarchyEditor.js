import * as d3 from "d3";
import { CHART_OUTLINE_MUTED } from "@/utils/chartTheme";

import store from "@/store/store";
import { pubsub } from "@/utils/pubsub";

import {
  allowedLinkStyles,
  assignRadius,
  defaultViewConfig,
  nodeCornerRadius,
  nodeHalfSize,
  triangleBottomFactor,
  triangleTopFactor,
} from "./d3HierarchyEditor/constants";
import { clampNumber } from "./d3HierarchyEditor/helpers";
import {
  clearSelection,
  getSelectedNodes,
  getSelectedNodesToModify,
  isRootNodeId,
  resetDragVisualState,
  setNodeSelection,
  toggleNodeSelection,
} from "./d3HierarchyEditor/selection";
import { drawHierarchy, drawLinks, drawNodes } from "./d3HierarchyEditor/rendering";
import {
  addNodeEvents,
  getBrush,
  getDragBehaviour,
  onInitialNodeDrag,
  onNodeClick,
} from "./d3HierarchyEditor/interactions";
import {
  addSelectedNodes,
  addSubscriptions,
  aggregateSelectedNodesAction,
  destroy,
  focusNode,
  inspectNode,
  onNodeMenuVisibilityChanged,
  onChangeHierarchy,
  onChangeOrder,
  onResize,
  removeSelectedNodes,
  scheduleNavioSync,
  setNavioNodes,
} from "./d3HierarchyEditor/commands";

const { publish } = pubsub;

export default class D3HierarchyEditor {
  orientation = "vertical";
  linkStyle = "smooth";
  viewConfig = defaultViewConfig;
  selectionMode = "none";
  isClickSelectionMode = false;
  targetNode = null;
  nodesDragged = [];
  navioSyncTimeout = null;
  subscriptionHandlers = {};
  isNodeMenuOpen = false;

  getSelectedNodes = getSelectedNodes;

  getSelectedNodesToModify = getSelectedNodesToModify;

  isRootNodeId = isRootNodeId;

  setNodeSelection = setNodeSelection;

  toggleNodeSelection = toggleNodeSelection;

  clearSelection = clearSelection;

  resetDragVisualState = resetDragVisualState;

  drawHierarchy = drawHierarchy;

  drawNodes = drawNodes;

  drawLinks = drawLinks;

  addNodeEvents = addNodeEvents;

  getDragBehaviour = getDragBehaviour;

  onInitialNodeDrag = onInitialNodeDrag;

  onNodeClick = onNodeClick;

  getBrush = getBrush;

  scheduleNavioSync = scheduleNavioSync;

  onChangeOrder = onChangeOrder;

  setNavioNodes = setNavioNodes;

  onChangeHierarchy = onChangeHierarchy;

  addSelectedNodes = addSelectedNodes;

  removeSelectedNodes = removeSelectedNodes;

  onResize = onResize;

  aggregateSelectedNodes = aggregateSelectedNodesAction;

  inspectNode = inspectNode;

  focusNode = focusNode;

  onNodeMenuVisibilityChanged = onNodeMenuVisibilityChanged;

  addSubscriptions = addSubscriptions;

  destroy = destroy;

  constructor(container, data, dispatcher, options = {}) {
    this.containerRef = container;
    this.dispatcher = dispatcher;
    this.viewConfig = this.normalizeViewConfig(options.viewConfig);

    if (options.orientation) this.setOrientation(options.orientation);
    if (options.linkStyle) this.setLinkStyle(options.linkStyle);

    this.descriptions = store.getState().cantab.present.descriptions;
    this.dims = container.getBoundingClientRect();

    this.width = this.dims.width;
    this.height = this.dims.height;
    this.data = data;

    this.svg = d3.select(this.containerRef);

    this.svg
      .on("click.editor", (event) => {
        const clickedOnNode = Boolean(event?.target?.closest?.(".circleG"));
        if (this.isNodeMenuOpen && clickedOnNode) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        publish("untoggleEvent", {});
        publish("closeResultsEvent", {});
        publish("closeOptionMenu", {});
      })
      .on("contextmenu.editor", (event) => {
        publish("untoggleEvent", {});
        publish("closeResultsEvent", {});
        publish("closeOptionMenu", {});
        this.clearSelection();
        event.preventDefault();
        event.stopPropagation();
      });

    this.brush = this.getBrush();

    d3.select(window).on("keydown.hierarchy-editor", (event) => {
      if (event.key === "b" || event.key === "B") {
        this.setSelectionMode("brush");
      }
    });

    this.main = this.svg.select("g#main-container").node()
      ? this.svg.select("g#main-container")
      : this.svg.append("g").attr("id", "main-container");

    const baseTransform = this.getBaseTransform();

    this.zoomBehaviour = d3
      .zoom()
      .scaleExtent([0.1, 1])
      .translateExtent([
        [-18000, -18000],
        [18500, 18500],
      ])
      .on("zoom", (e) => {
        this.main.attr("transform", e.transform);
      });

    this.main.attr("transform", baseTransform);
    this.svg
      .call(this.zoomBehaviour)
      .call(this.zoomBehaviour.transform, baseTransform);

    const glink = this.main.select("g#links").node()
      ? this.main.select("g#links")
      : this.main.append("g").attr("id", "links");

    this.main.select("g#nodes").node()
      ? this.main.select("g#nodes")
      : this.main.append("g").attr("id", "nodes");

    glink
      .attr("fill", "none")
      .attr("stroke", CHART_OUTLINE_MUTED)
      .attr("stroke-opacity", 1)
      .attr("stroke-width");

    this.addSubscriptions();

    this.tooltip = d3.select("body").select("div.tooltip");
    if (this.tooltip.empty()) {
      this.tooltip = d3.select("body").append("div").attr("class", "tooltip");
    }

    this.update(data);
  }

  isHorizontal() {
    return this.orientation !== "vertical";
  }

  projectPoint(x, y) {
    return this.isHorizontal() ? { x: y, y: x } : { x, y };
  }

  getNodeTransform(node, usePrevious = false) {
    const nx = usePrevious ? (node.x0 ?? node.x) : node.x;
    const ny = usePrevious ? (node.y0 ?? node.y) : node.y;
    const { x, y } = this.projectPoint(nx, ny);
    return `translate(${x}, ${y})`;
  }

  getLinkPath(link) {
    const [sx, sy, tx, ty] = this.getProjectedLinkCoords(link);

    if (this.linkStyle === "straight") {
      return `M${sx},${sy}L${tx},${ty}`;
    }

    if (this.linkStyle === "elbow") {
      const midX = (sx + tx) / 2;
      return `M${sx},${sy}L${midX},${sy}L${midX},${ty}L${tx},${ty}`;
    }

    const controlPointX = sx + (tx - sx) * 0.5;
    return `M${sx},${sy}C${controlPointX},${sy} ${controlPointX},${ty} ${tx},${ty}`;
  }

  getProjectedLinkCoords(link) {
    if (this.isHorizontal()) {
      return [link.source.y, link.source.x, link.target.y, link.target.x];
    }

    return [link.source.x, link.source.y, link.target.x, link.target.y];
  }

  getLogicalDelta(dx, dy) {
    if (this.isHorizontal()) {
      return { x: dy, y: dx };
    }
    return { x: dx, y: dy };
  }

  getBaseTransform(scale = 0.8) {
    if (this.isHorizontal()) {
      return d3.zoomIdentity
        .translate(this.width / 8, this.height / 2)
        .scale(scale);
    }

    return d3.zoomIdentity
      .translate(this.width / 2, this.height / 3)
      .scale(scale);
  }

  normalizeViewConfig(viewConfig = {}) {
    return {
      nodeSize: clampNumber(
        viewConfig.nodeSize,
        36,
        140,
        defaultViewConfig.nodeSize,
      ),
      depthSpacing: clampNumber(
        viewConfig.depthSpacing,
        120,
        420,
        defaultViewConfig.depthSpacing,
      ),
      nodeScale: clampNumber(
        viewConfig.nodeScale,
        0.6,
        1.8,
        defaultViewConfig.nodeScale,
      ),
      labelFontSize: clampNumber(
        viewConfig.labelFontSize,
        12,
        40,
        defaultViewConfig.labelFontSize,
      ),
      labelMaxLength: clampNumber(
        viewConfig.labelMaxLength,
        8,
        60,
        defaultViewConfig.labelMaxLength,
      ),
      linkWidth: clampNumber(
        viewConfig.linkWidth,
        1,
        6,
        defaultViewConfig.linkWidth,
      ),
      showLabels:
        typeof viewConfig.showLabels === "boolean"
          ? viewConfig.showLabels
          : defaultViewConfig.showLabels,
    };
  }

  getNodeHalfSize() {
    return nodeHalfSize * this.viewConfig.nodeScale;
  }

  getNodeCornerRadius() {
    return nodeCornerRadius * this.viewConfig.nodeScale;
  }

  getNodeTrianglePath() {
    const halfSize = this.getNodeHalfSize();
    const top = -(halfSize * triangleTopFactor);
    const bottom = halfSize * triangleBottomFactor;
    return `M 0 ${top} L ${halfSize} ${bottom} L ${-halfSize} ${bottom} Z`;
  }

  getAssignRadius() {
    return assignRadius * this.viewConfig.nodeScale;
  }

  getLabelOffset() {
    return -(this.getNodeHalfSize() + 15.5);
  }

  getLabelText(node) {
    const label = node?.data?.name ?? "";
    const maxLength = Math.round(this.viewConfig.labelMaxLength);
    if (label.length <= maxLength) return label;
    return `${label.slice(0, Math.max(1, maxLength - 1))}...`;
  }

  setViewConfig(viewConfig) {
    const nextViewConfig = this.normalizeViewConfig(viewConfig);
    const hasChanges = Object.keys(defaultViewConfig).some(
      (key) => this.viewConfig[key] !== nextViewConfig[key],
    );

    if (!hasChanges) return;

    this.viewConfig = nextViewConfig;

    if (!this.root) return;

    this.drawHierarchy(this.root, true);
  }

  setOrientation(orientation) {
    const nextOrientation =
      orientation === "vertical" ? "vertical" : "horizontal";

    if (this.orientation === nextOrientation) return;

    this.orientation = nextOrientation;
    const baseTransform = this.getBaseTransform();

    if (this.main && this.zoomBehaviour && this.svg) {
      this.main.attr("transform", baseTransform);
      this.svg.call(this.zoomBehaviour.transform, baseTransform);
    }

    if (!this.root) return;

    const crossSize = this.isHorizontal() ? this.dims.height : this.dims.width;
    this.root.x0 = crossSize / 2;
    this.root.y0 = 0;

    this.drawHierarchy(this.root, true);
  }

  setLinkStyle(linkStyle) {
    const nextLinkStyle = allowedLinkStyles.has(linkStyle)
      ? linkStyle
      : "smooth";

    if (this.linkStyle === nextLinkStyle) return;

    this.linkStyle = nextLinkStyle;

    if (!this.root) return;

    this.drawLinks(this.root);
  }

  setClickSelectionMode(enabled) {
    this.setSelectionMode(enabled ? "click" : "none");
  }

  setSelectionMode(mode) {
    const nextMode = mode === "brush" || mode === "click" ? mode : "none";
    this.selectionMode = nextMode;
    this.isClickSelectionMode = nextMode === "click";
    if (this.svg) {
      this.svg.style("cursor", this.isClickSelectionMode ? "pointer" : "default");
    }

    if (nextMode === "brush") {
      this.activateBrushSelection();
      return;
    }

    this.deactivateBrushSelection();
  }

  activateBrushSelection() {
    if (!this.svg || !this.brush) return;
    this.svg.selectAll(".brush").remove();
    this.svg.append("g").attr("class", "brush").call(this.brush);
  }

  deactivateBrushSelection() {
    if (!this.svg) return;
    this.svg.selectAll(".brush").remove();
    this.svg.on(".brush", null);
    if (this.zoomBehaviour) {
      this.svg.call(this.zoomBehaviour);
    }
  }

  setSize() {
    this.parentRect = this.containerRef.getBoundingClientRect();
    const width = this.parentRect.width;
    const height = this.parentRect.height;
    this.onResize({ width, height });
  }

  initHierarchy() {
    const { root, dims } = this;

    this.nNodes = 0;

    const crossSize = this.isHorizontal() ? dims.height : dims.width;
    root.x0 = crossSize / 2;
    root.y0 = 0;
    root.descendants().forEach((d) => {
      d.id = d.data.id;
      if (d.children == null) {
        d.children = [];
      }
      d._children = null;
      if (d.height === 0) {
        d.children = null;
      }

      if (d.data.isShown) {
        d._children = null;
      } else {
        d._children = d.children;
        d.children = null;
      }

      this.nNodes += 1;
    });
  }

  update(newData) {
    this.setSize();
    this.data = newData;
    this.root = d3.hierarchy(newData);
    this.initHierarchy();
    this.drawHierarchy(this.root, true);
    this.setNavioNodes();
  }
}
