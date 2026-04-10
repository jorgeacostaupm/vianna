import React from "react";
import { useSelector } from "react-redux";
import {
  HomeOutlined,
  BarChartOutlined,
  DotChartOutlined,
  LineChartOutlined,
  BugFilled,
} from "@ant-design/icons";

import LinkButton from "@/components/ui/ButtonLink";
import DataManagementButton from "@/components/Data/Buttons/DataManagementButton";

export default function AppsButtons() {
  const dt = useSelector((state) => state.dataframe.dataframe);

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <DataManagementButton />
      <LinkButton to="overview" icon={<HomeOutlined />} />
      {dt && (
        <>
          <LinkButton to="compare" icon={<BarChartOutlined />} />
          <LinkButton to="evolution" icon={<LineChartOutlined />} />
          <LinkButton to="correlation" icon={<DotChartOutlined />} />
          <LinkButton to="cantab" icon={<BugFilled />} />
        </>
      )}
    </div>
  );
}
