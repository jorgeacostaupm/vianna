export function getStackedButtonTooltipPlacement(
  index,
  total,
  fallback = "top",
) {
  if (index < 0 || index >= total) return fallback;
  if (index === 0) return "top";
  if (index === total - 1) return "bottom";
  return "right";
}
