import React from "react";
import { Tag } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { CloseOutlined } from "@ant-design/icons";

import { setFilteringList } from "@/store/features/evolution";

const FilteredVariables = () => {
  const filterList = useSelector((s) => s.evolution.filterList);
  const dispatch = useDispatch();

  const handleClose = (removedTag) => {
    const newVariables = filterList.filter((tag) => tag !== removedTag);
    dispatch(setFilteringList(newVariables));
  };

  return (
    <>
      <div>Filtered Variables:</div>
      <div
        style={{
          padding: "5px",
          gap: "2px",
          minHeight: "20px",
          border: "1px solid var(--color-border)",
          borderRadius: "5px",
        }}
      >
        {filterList.map((tag) => {
          const data = tag.split("^");
          const name = data[0];
          const population = data[1];

          return (
            <Tag
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                color: "white",
                background: "var(--color-brand)",
              }}
              key={tag}
              closable
              onClose={() => handleClose(tag)}
              closeIcon={<CloseOutlined style={{ color: "white" }} />}
            >
              <span
                title={name}
                style={{
                  width: "50%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </span>
              <span
                title={population}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {population}
              </span>
            </Tag>
          );
        })}
      </div>
    </>
  );
};

export default FilteredVariables;
