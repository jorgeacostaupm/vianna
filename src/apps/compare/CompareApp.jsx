import { useDispatch, useSelector } from "react-redux";

import { selectCategoricalVars } from "@/store/features/main";
import { setSelectedVar } from "@/store/features/compare";
import { Apps } from "@/utils/constants";
import registry from "./registry";
import Grid from "@/components/grid";
import Panel from "./Panel";
import { createComparePanelCommands } from "./panelCommands";

export default function CompareApp() {
  const dispatch = useDispatch();
  const cVars = useSelector(selectCategoricalVars);

  const panel = (addView) => {
    const commands = createComparePanelCommands({
      addView,
      dispatch,
      categoricalVariables: cVars,
      setSelectedVar,
    });

    return (
      <Panel
        generateDistribution={commands.addDistribution}
        generateTest={commands.runTestForVariable}
        generateRanking={commands.addRanking}
      />
    );
  };

  return (
    <Grid
      registry={registry}
      componentName={Apps.COMPARE}
      panel={panel}
      panelPlacement="left"
      panelGridLayout={{ w: 3, minW: 3, maxW: 5, h: 7, minH: 6 }}
      compactType="vertical"
    />
  );
}
