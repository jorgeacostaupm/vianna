import { setInit } from "@/store/features/correlation";
import { Apps } from "@/utils/Constants";
import registry from "./registry";
import Grid from "@/core/Grid";
import Panel from "./Panel";

export default function CorrelationApp() {
  const panel = (addView) => <Panel addView={addView} />;

  return (
    <Grid
      setInit={setInit}
      registry={registry}
      componentName={Apps.CORRELATION}
      panel={panel}
      panelPlacement="left"
      flow="horizontal"
    />
  );
}
