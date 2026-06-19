import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Apps } from "@/utils/constants";
import registry from "./registry";
import Grid from "@/components/grid";
import Panel from "./Panel/Panel";
import { setWorkspace } from "@/store/features/evolution";

export default function EvolutionApp() {
  const dispatch = useDispatch();
  const workspace = useSelector((state) => state.evolution.workspace);
  const handleWorkspaceChange = useCallback(
    (nextWorkspace) => dispatch(setWorkspace(nextWorkspace)),
    [dispatch],
  );

  const panel = (addView) => (
    <Panel
      generateEvolution={(variable) =>
        variable && addView("evolution", { variable })
      }
    />
  );

  return (
    <Grid
      registry={registry}
      componentName={Apps.EVOLUTION}
      panel={panel}
      panelPlacement="left"
      panelGridLayout={{ w: 3, minW: 3, maxW: 5, h: 7, minH: 4 }}
      compactType="vertical"
      workspace={workspace}
      onWorkspaceChange={handleWorkspaceChange}
    />
  );
}
