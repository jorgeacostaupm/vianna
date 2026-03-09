import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";

const wideCharts = ["ranking"];
const squareCharts = ["Scatter Plot Matrix", "Correlation Matrix", "PCA"];

export default function useGridViews(defaultW = 3, defaultH = 4, options = {}) {
  const { topOffsetRows = 0, leftOffsetCols = 0, totalCols = 12 } = options;
  const [views, setViews] = useState([]);
  const [layout, setLayout] = useState([]);
  const dfFilename = useSelector((s) => s.dataframe.present.filename);
  const hierFilename = useSelector((s) => s.metadata.filename);

  const addView = useCallback(
    (type, props = {}) => {
      const id = `${type}-${Date.now()}`;

      setViews((prev) => [{ id, type, ...props }, ...prev]);

      console.log("type", type);

      const xBase = type === "pointrange" ? defaultW : 0;
      let yOffset = type === "pointrange" ? 0 : defaultH;
      let w = defaultW;
      let h = defaultH;
      if (wideCharts.includes(type)) w = 20;
      else if (squareCharts.includes(type)) ((w = 12), (h = 8));

      const availableCols = Math.max(totalCols - leftOffsetCols, 1);
      const width = Math.min(w, availableCols);
      const desiredX = leftOffsetCols + xBase;
      const maxX = leftOffsetCols + Math.max(availableCols - width, 0);
      const x = Math.min(desiredX, maxX);

      setLayout((prev) => [
        { i: id, x, y: topOffsetRows, w: width, h },
        ...prev.map((l) => ({ ...l, y: l.y + yOffset })),
      ]);
    },
    [defaultH, defaultW, leftOffsetCols, topOffsetRows, totalCols],
  );

  const removeView = useCallback((id) => {
    setViews((p) => p.filter((v) => v.id !== id));
    setLayout((p) => p.filter((l) => l.i !== id));
  }, []);

  useEffect(() => {
    setViews([]);
    setLayout([]);
  }, [dfFilename, hierFilename]);

  return { views, layout, setLayout, addView, removeView };
}
