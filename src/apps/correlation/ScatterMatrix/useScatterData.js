import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { notifyError } from "@/notifications";

export default function useScatterData(isSync = true, params) {
  const [data, setData] = useState([]);
  const selection = useSelector((s) => s.dataframe.selection);

  useEffect(() => {
    if (!isSync) return;

    try {
      const { variables } = params;
      const res = variables.length >= 2 ? selection : null;
      setData(res);
    } catch (error) {
      notifyError({
        message: "Could not prepare scatter matrix data",
        error,
        fallback: "Failed to prepare data for the scatter matrix.",
      });
      setData(null);
    }
  }, [isSync, params, selection]);

  return [data, setData];
}
