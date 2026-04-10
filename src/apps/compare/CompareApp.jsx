import { useDispatch, useSelector } from "react-redux";

import { selectCategoricalVars } from "@/store/features/main";
import { setInit, setSelectedVar } from "@/store/features/compare";
import { Apps } from "@/utils/Constants";
import registry from "./registry";
import Grid from "@/core/Grid";
import Panel from "./Panel";

export default function CompareApp() {
  const dispatch = useDispatch();
  const cVars = useSelector(selectCategoricalVars);

  const panel = (addView) => {
    const runTestForVariable = (test, variable) => {
      if (!test || !variable) {
        return;
      }

      dispatch(setSelectedVar(variable));

      const isCat = cVars.includes(variable);
      addView("pairwise", { test, variable });
      if (!isCat) addView("pointrange", { test, variable });
    };

    return (
      <Panel
        generateDistribution={(variable) =>
          addView(cVars.includes(variable) ? "categoric" : "numeric", {
            variable,
          })
        }
        generateTest={runTestForVariable}
        generateRanking={(test) =>
          addView("ranking", {
            test,
            onVariableClick: (variable) => runTestForVariable(test, variable),
          })
        }
      />
    );
  };

  return (
    <Grid
      setInit={setInit}
      registry={registry}
      componentName={Apps.COMPARE}
      panel={panel}
      panelPlacement="left"
      flow="horizontal"
    />
  );
}
