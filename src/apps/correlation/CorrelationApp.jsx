import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Apps } from "@/utils/constants";
import registry from "./registry";
import Grid from "@/components/grid";
import Panel from "./Panel/Panel";
import { setWorkspace } from "@/store/features/correlation";

export default function CorrelationApp() {
  const dispatch = useDispatch();
  const workspace = useSelector((state) => state.correlation.workspace);
  const handleWorkspaceChange = useCallback(
    (nextWorkspace) => dispatch(setWorkspace(nextWorkspace)),
    [dispatch],
  );

  const panel = (addView, gridActions = {}) => (
    <Panel
      addChart={(type) => type && addView(type)}
      closeAllViews={gridActions.closeAllViews}
      hasViews={gridActions.hasViews}
    />
  );

  return (
    <Grid
      registry={registry}
      componentName={Apps.CORRELATION}
      panel={panel}
      panelPlacement="left"
      panelGridLayout={{ w: 3, minW: 3, maxW: 5, h: 5, minH: 4 }}
      compactType="vertical"
      workspace={workspace}
      onWorkspaceChange={handleWorkspaceChange}
      enableCloseAllViews
    />
  );
}
