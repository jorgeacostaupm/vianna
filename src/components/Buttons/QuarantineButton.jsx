import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { BugFilled } from "@ant-design/icons";

import { setQuarantineData } from "@/store/features/main";
import { setDataframe } from "@/store/features/dataframe";

import { ORDER_VARIABLE } from "@/utils/Constants";
import BarButton from "@/components/ui/BarButton";

export default function QuarantineButton() {
  const dispatch = useDispatch();
  const selection = useSelector((state) => state.dataframe.selection);
  const data = useSelector((state) => state.dataframe.dataframe);
  const qData =
    useSelector((state) => state.main.quarantineData) || [];
  const ids = selection?.map((item) => item[ORDER_VARIABLE]);

  const onQuarantine = () => {
    const newData = data?.filter(
      (item) => !ids?.includes(item[ORDER_VARIABLE])
    );

    const newQData = data?.filter((item) =>
      ids?.includes(item[ORDER_VARIABLE])
    );
    dispatch(setDataframe(newData));
    dispatch(setQuarantineData([...qData, ...newQData]));
  };

  return (
    <BarButton
      title={"Send selection to Quarantine view"}
      onClick={onQuarantine}
      icon={<BugFilled />}
    />
  );
}
