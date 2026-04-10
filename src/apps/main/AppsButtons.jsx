import React from "react";
import { useSelector } from "react-redux";
import {
  BarChartOutlined,
  DotChartOutlined,
  LineChartOutlined,
  PartitionOutlined,
  BugFilled,
} from "@ant-design/icons";

import LinkButton from "@/components/ui/ButtonLink";
import DataManagementButton from "@/components/Data/Buttons/DataManagementButton";

export default function AppsButtons({
  dataManagementOpen,
  onDataManagementOpenChange,
}) {
  const dt = useSelector((state) => state.dataframe.dataframe);

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      <DataManagementButton
        open={dataManagementOpen}
        onOpenChange={onDataManagementOpenChange}
      />
      <LinkButton to="metadata" icon={<PartitionOutlined />} />
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
