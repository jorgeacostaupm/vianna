import { Apps } from "@/utils/constants";
import registry from "./registry";
import Grid from "@/components/grid";
import Panel from "./Panel";
import { createEvolutionPanelCommands } from "./panelCommands";

export default function EvolutionApp() {
  const panel = (addView) => {
    const commands = createEvolutionPanelCommands({ addView });
    return <Panel generateEvolution={commands.addEvolution} />;
  };

  return (
    <Grid
      registry={registry}
      componentName={Apps.EVOLUTION}
      panel={panel}
      panelPlacement="left"
      panelGridLayout={{ w: 3, minW: 3, maxW: 5, h: 7, minH: 4 }}
      compactType="vertical"
    />
  );
}
