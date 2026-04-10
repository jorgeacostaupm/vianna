import * as d3 from "d3";
import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Button, Tooltip } from "antd";

import { UserDeleteOutlined, UsergroupDeleteOutlined } from "@ant-design/icons";
import store from "@/store/store";
import { setDataframe } from "@/store/features/dataframe";
import { setQuarantineData } from "@/store/features/main";
import { ORDER_VARIABLE } from "@/utils/Constants";
import styles from "@/styles/Charts.module.css";
import buttonStyles from "@/styles/Buttons.module.css";

const QuarantineObservationTooltip = ({ d, idVar }) => {
  const dispatch = useDispatch();
  const dataframe =
    useSelector((state) => state.dataframe.dataframe) || [];
  const quarantineData =
    useSelector((state) => state.main.quarantineData) || [];

  const handleQuarantineById = useCallback(() => {
    const id = d[idVar];
    const filtered = dataframe.filter((item) => item[idVar] === id);
    const remaining = dataframe.filter((item) => item[idVar] !== id);
    dispatch(setDataframe(remaining));
    dispatch(setQuarantineData([...quarantineData, ...filtered]));
  }, [dispatch, dataframe, quarantineData, d, idVar]);

  const handleQuarantineObs = useCallback(() => {
    const ord = d[ORDER_VARIABLE];
    const filtered = dataframe.filter((item) => item[ORDER_VARIABLE] === ord);
    const remaining = dataframe.filter((item) => item[ORDER_VARIABLE] !== ord);
    dispatch(setDataframe(remaining));
    dispatch(setQuarantineData([...quarantineData, ...filtered]));
  }, [dispatch, dataframe, quarantineData, d]);

  return (
    <div className={styles.hierarchyTooltip}>
      <Tooltip title={"Send observation to Quarantine"}>
        <Button
          shape="circle"
          className={buttonStyles.borderedButton}
          onClick={handleQuarantineObs}
        >
          <UserDeleteOutlined />
        </Button>
      </Tooltip>

      {idVar && (
        <Tooltip
          title={"Send observation and all coincident ids to Quarantine"}
        >
          <Button
            shape="circle"
            className={buttonStyles.borderedButton}
            onClick={handleQuarantineById}
          >
            <UsergroupDeleteOutlined />
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

export default function renderQTooltip(tooltip, d, idVar) {
  tooltip.style("display", "block").style("background", "transparent");

  tooltip.html("");

  d3.select("body").on("click", function () {
    tooltip.style("display", "none");
  });

  const tooltipNode = tooltip.node();

  const root = ReactDOM.createRoot(tooltipNode);
  root.render(
    <Provider store={store}>
      <QuarantineObservationTooltip d={d} idVar={idVar} />
    </Provider>
  );
}
