export const transitionDuration = 500;
export const resolveTransitionDuration = ({
  instant = false,
  animateTransitions = true,
} = {}) => (instant || animateTransitions === false ? 0 : transitionDuration);
export const dragClickThreshold = 5;
// ponytail: browsers do not expose the OS double-click interval; raise this if slow double-clicks still toggle first.
export const nodeDoubleClickDelayMs = 300;
export const tooltipHoverDelayMs = 2000;
export const nodeHalfSize = 12.5;
export const nodeCornerRadius = 4;
export const triangleTopFactor = 1.152;
export const triangleBottomFactor = 0.576;
export const assignRadius = 40;
export const ghostCircleGap = 10;
export const getGhostCircleMinDistance = (radius) =>
  Math.max(0, radius) * 2 + ghostCircleGap;

export const allowedLinkStyles = new Set(["smooth", "elbow", "straight"]);

export const defaultViewConfig = Object.freeze({
  nodeSize: 60,
  depthSpacing: 240,
  nodeScale: 1,
  labelFontSize: 24,
  labelMaxLength: 20,
  linkWidth: 1,
  showLabels: true,
  animateTransitions: true,
});
