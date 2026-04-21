import { Apps } from "@/utils/constants";
import registry from "./registry";
import Grid from "@/components/grid";
import Panel from "./Panel";
import { createCorrelationPanelCommands } from "./panelCommands";

export default function CorrelationApp() {
  const panel = (addView) => {
    const commands = createCorrelationPanelCommands({ addView });
    return <Panel commands={commands} />;
  };

  return (
    <Grid
      registry={registry}
      componentName={Apps.CORRELATION}
      panel={panel}
      panelPlacement="left"
      panelGridLayout={{ w: 3, minW: 3, maxW: 5, h: 5, minH: 4 }}
      compactType="vertical"
    />
  );
}
