import { resolveViewComponent } from "./viewDefinitions";

export function createViewRenderer(registry, removeView, updateView) {
  return function renderView(view) {
    const Comp = resolveViewComponent(registry[view.type]);
    if (!Comp) return null;

    return (
      <div key={view.id} className="grid-view-item">
        <Comp
          {...view}
          remove={() => removeView(view.id)}
          updateView={(patch) => updateView(view.id, patch)}
        />
      </div>
    );
  };
}
