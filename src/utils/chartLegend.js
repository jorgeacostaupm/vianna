import * as d3 from "d3";

export const DEFAULT_LEGEND_MAX_WIDTH = 188;
const DEFAULT_LEGEND_GAP = 16;
const DEFAULT_LEGEND_PADDING_X = 12;
const DEFAULT_LEGEND_PADDING_Y = 12;

export function createLegendLayout({
  width,
  height,
  margin,
  showLegend = true,
  legendMaxWidth = DEFAULT_LEGEND_MAX_WIDTH,
  legendGap = DEFAULT_LEGEND_GAP,
  legendY,
  legendPaddingX = DEFAULT_LEGEND_PADDING_X,
  legendPaddingY = DEFAULT_LEGEND_PADDING_Y,
  minChartWidth = 220,
} = {}) {
  const safeMargin = margin || { top: 0, right: 0, bottom: 0, left: 0 };
  const availableWidth = Math.max(
    0,
    (width || 0) - safeMargin.left - safeMargin.right,
  );
  const chartHeight = Math.max(
    0,
    (height || 0) - safeMargin.top - safeMargin.bottom,
  );

  let legendWidth = 0;
  if (showLegend) {
    const preferredWidth = Math.max(
      0,
      Math.min(legendMaxWidth, availableWidth - minChartWidth - legendGap),
    );
    legendWidth =
      preferredWidth > 0
        ? preferredWidth
        : Math.max(0, Math.min(legendMaxWidth, availableWidth * 0.28));
  }

  const hasLegend = showLegend && legendWidth > 0;
  const appliedLegendGap = hasLegend ? legendGap : 0;
  const chartWidth = Math.max(0, availableWidth - legendWidth - appliedLegendGap);

  return {
    chartWidth,
    chartHeight,
    showLegend: hasLegend,
    legendWidth,
    legendInnerWidth: Math.max(0, legendWidth - legendPaddingX * 2),
    legendInnerHeight: Math.max(0, chartHeight - legendPaddingY * 2),
    legendX: safeMargin.left + chartWidth + appliedLegendGap,
    legendY: Number.isFinite(legendY) ? legendY : safeMargin.top,
    legendPaddingX,
    legendPaddingY,
  };
}

export function appendLegendRoot(svg, layout, className = "chart-legend-root") {
  if (!svg || !layout?.showLegend) return null;

  const legendRoot = svg
    .append("g")
    .attr("class", className)
    .attr("transform", `translate(${layout.legendX},${layout.legendY})`);

  legendRoot
    .append("rect")
    .attr("width", layout.legendWidth)
    .attr("height", layout.chartHeight)
    .attr("fill", "transparent");

  return legendRoot
    .append("g")
    .attr("transform", `translate(${layout.legendPaddingX},${layout.legendPaddingY})`);
}

export function truncateSvgText(textSelection, maxWidth) {
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;

  textSelection.each(function () {
    const textNode = d3.select(this);
    const fullText = textNode.attr("data-full-text") || textNode.text();

    textNode.attr("data-full-text", fullText);
    textNode.text(fullText);
    textNode.selectAll("title").remove();

    if (this.getComputedTextLength() <= maxWidth) {
      return;
    }

    let truncated = fullText;
    while (truncated.length > 0 && this.getComputedTextLength() > maxWidth) {
      truncated = truncated.slice(0, -1);
      textNode.text(truncated.length > 0 ? `${truncated}…` : "…");
    }

    textNode.append("title").text(fullText);
  });
}
