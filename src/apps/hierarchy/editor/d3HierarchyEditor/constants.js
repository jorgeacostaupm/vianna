export const transitionDuration = 500;
export const dragClickThreshold = 5;
export const nodeHalfSize = 12.5;
export const nodeCornerRadius = 4;
export const triangleTopFactor = 1.152;
export const triangleBottomFactor = 0.576;
export const assignRadius = 40;

export const allowedLinkStyles = new Set(["smooth", "elbow", "straight"]);

export const defaultViewConfig = Object.freeze({
  nodeSize: 60,
  depthSpacing: 240,
  nodeScale: 1,
  labelFontSize: 24,
  labelMaxLength: 20,
  linkWidth: 1,
  showLabels: true,
});
