import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RollbackOutlined } from "@ant-design/icons";

import { setDataframe } from "@/store/features/dataframe";
import BarButton from "@/components/ui/BarButton";
import { setFilteredData } from "@/store/features/main";
import { notifyWarning } from "@/notifications";

export default function ResetButton() {
  const dispatch = useDispatch();
  const dataframe = useSelector((state) => state.dataframe.dataframe);
  const filteredData = useSelector(
    (state) => state.main.filteredData,
  );

  const onReset = () => {
    if (!filteredData || filteredData.length === 0) {
      notifyWarning({
        message: "No backup data to restore",
        description: "There are no filtered rows waiting to be restored.",
      });
    } else {
      dispatch(setDataframe([...filteredData, ...dataframe]));
      dispatch(setFilteredData(null));
    }
  };

  return (
    <BarButton
      title="Restore original data"
      icon={<RollbackOutlined />}
      onClick={onReset}
    />
  );
}
