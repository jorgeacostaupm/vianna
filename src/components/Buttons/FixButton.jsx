import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { PauseOutlined } from "@ant-design/icons";

import { setFilteredData } from "@/store/features/main";
import { setDataframe } from "@/store/features/dataframe";

import { ORDER_VARIABLE } from "@/utils/Constants";
import BarButton from "@/components/ui/BarButton";

export default function FixButton() {
  const dispatch = useDispatch();
  const selection = useSelector((state) => state.dataframe.selection);
  const dataframe = useSelector((state) => state.dataframe.dataframe);

  const onFilter = () => {
    const ids = selection.map((item) => item[ORDER_VARIABLE]);
    const filteredData = dataframe.filter(
      (item) => !ids.includes(item[ORDER_VARIABLE])
    );
    if (!filteredData || filteredData.length === 0) return;

    dispatch(setDataframe(selection));
    dispatch(setFilteredData(filteredData));
  };

  return (
    <BarButton
      title="Fix selection"
      icon={<PauseOutlined />}
      onClick={onFilter}
    />
  );
}
