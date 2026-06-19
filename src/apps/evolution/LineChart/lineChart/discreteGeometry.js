import * as d3 from "d3";

export function createRatioScale(
  scaleType = "sqrt",
  maxValue = 1,
  range = [1, 10],
) {
  const safeMax = Math.max(1, Number(maxValue) || 1);
  const [minRange, maxRange] = range;

  if (scaleType === "linear") {
    return d3.scaleLinear().domain([1, safeMax]).range([minRange, maxRange]);
  }

  if (scaleType === "log") {
    return d3.scaleLog().domain([1, safeMax]).range([minRange, maxRange]);
  }

  return d3.scaleSqrt().domain([1, safeMax]).range([minRange, maxRange]);
}

export function normalizePixelRange(
  rawMin,
  rawMax,
  fallbackMin,
  fallbackMax,
  absoluteMin = 0,
) {
  const parsedMin = Number(rawMin);
  const parsedMax = Number(rawMax);
  let min = Number.isFinite(parsedMin) ? parsedMin : fallbackMin;
  let max = Number.isFinite(parsedMax) ? parsedMax : fallbackMax;

  min = Math.max(absoluteMin, min);
  max = Math.max(absoluteMin, max);

  if (max < min) {
    [min, max] = [max, min];
  }

  if (max === min) {
    max = min + Math.max(0.5, absoluteMin * 0.1);
  }

  return [min, max];
}

export function formatRatio(compatible, total) {
  if (!total) return "0.0%";
  return `${((compatible / total) * 100).toFixed(1)}%`;
}

export function getRectEdgePoint(fromRect, toRect) {
  const dx = toRect.x - fromRect.x;
  const dy = toRect.y - fromRect.y;
  if (dx === 0 && dy === 0) {
    return { x: fromRect.x, y: fromRect.y };
  }

  const halfWidth = Math.max(1, fromRect.width / 2);
  const halfHeight = Math.max(1, fromRect.height / 2);
  const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);

  return {
    x: fromRect.x + dx * scale,
    y: fromRect.y + dy * scale,
  };
}

export function buildLeadingRoundedRectPath(x, y, width, height, radius = 4) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  if (
    !Number.isFinite(safeWidth) ||
    !Number.isFinite(safeHeight) ||
    safeWidth <= 0 ||
    safeHeight <= 0
  ) {
    return "";
  }

  const safeRadius = Math.max(
    0,
    Math.min(Number(radius) || 0, safeHeight / 2, safeWidth),
  );
  const right = x + safeWidth;
  const bottom = y + safeHeight;

  if (safeRadius === 0) {
    return `M${x},${y}H${right}V${bottom}H${x}Z`;
  }

  return [
    `M${x + safeRadius},${y}`,
    `H${right}`,
    `V${bottom}`,
    `H${x + safeRadius}`,
    `Q${x},${bottom} ${x},${bottom - safeRadius}`,
    `V${y + safeRadius}`,
    `Q${x},${y} ${x + safeRadius},${y}`,
    "Z",
  ].join(" ");
}

export function buildRoundedRectPath(x, y, width, height, radius = 4) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  if (
    !Number.isFinite(safeWidth) ||
    !Number.isFinite(safeHeight) ||
    safeWidth <= 0 ||
    safeHeight <= 0
  ) {
    return "";
  }

  const safeRadius = Math.max(
    0,
    Math.min(Number(radius) || 0, safeHeight / 2, safeWidth / 2),
  );
  const right = x + safeWidth;
  const bottom = y + safeHeight;

  if (safeRadius === 0) {
    return `M${x},${y}H${right}V${bottom}H${x}Z`;
  }

  return [
    `M${x + safeRadius},${y}`,
    `H${right - safeRadius}`,
    `Q${right},${y} ${right},${y + safeRadius}`,
    `V${bottom - safeRadius}`,
    `Q${right},${bottom} ${right - safeRadius},${bottom}`,
    `H${x + safeRadius}`,
    `Q${x},${bottom} ${x},${bottom - safeRadius}`,
    `V${y + safeRadius}`,
    `Q${x},${y} ${x + safeRadius},${y}`,
    "Z",
  ].join(" ");
}

export function getDiscreteNodeWidthFromBandwidth(bandwidth) {
  return Math.max(14, Math.min(34, bandwidth * 0.56));
}

export function getDiscreteDefaultMeanRadius(bandwidth) {
  return getDiscreteNodeWidthFromBandwidth(bandwidth) / 2;
}
