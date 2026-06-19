export function buildAppUrl(route, location = window.location) {
  const base = `${location.origin}${location.pathname}${location.search}`;
  const path = String(route || "").trim();
  const hashPath = !path || path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;

  return `${base}#${hashPath}`;
}
