import React, { useEffect, useRef, useState } from "react";

import { Typography, Radio, Slider, Switch } from "antd";
import { useSelector } from "react-redux";
import {
  selectNumericVars,
  selectCategoricalVars,
} from "@/store/features/main";
import useResizeObserver from "@/hooks/useResizeObserver";
import RankingPlot from "./RankingPlot";
import ChartBar from "@/components/charts/ChartBar";
import styles from "@/styles/Charts.module.css";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import { computeRankingData } from "@/utils/functions";
import { ORDER_VARIABLE } from "@/utils/Constants";
import panelStyles from "@/styles/SettingsPanel.module.css";
import useViewRecordSnapshot from "@/hooks/useViewRecordSnapshot";
import { notifyError, notifyWarning } from "@/notifications";
import { extractOrderValues, uniqueColumns } from "@/utils/viewRecords";
import AxisLabelSizeControl from "@/components/ui/AxisLabelSizeControl";

const { Text } = Typography;

export default function Ranking({
  test,
  remove,
  id,
  onVariableClick,
  sourceOrderValues = [],
}) {
  const ref = useRef(null);
  const skippedSignatureRef = useRef("");
  const dimensions = useResizeObserver(ref);

  const groupVar = useSelector((state) => state.compare.groupVar);
  const selection = useSelector((state) => state.dataframe.selection);
  const numericVars = useSelector(selectNumericVars);

  const categoricVars = useSelector(selectCategoricalVars);
  const hierarchy = useSelector((state) => state.metadata.attributes);

  const [ranking, setRanking] = useState(null);
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({
    isSync: true,
    filterList: [],
    nBars: Math.min(numericVars.length, 10),
    pValue: 0.05,
    desc: true,
    showGrid: true,
    axisLabelFontSize: 16,
  });

  const liveOrderValues = React.useMemo(
    () => extractOrderValues(selection, (row) => row?.[groupVar] != null),
    [selection, groupVar],
  );

  const recordOrders = useViewRecordSnapshot({
    isSync: config.isSync,
    liveOrderValues,
    initialOrderValues: sourceOrderValues,
  });

  const requiredVariables = React.useMemo(() => {
    const attemptedVariables = [
      ...(data?.data || []).map((item) => item?.variable),
      ...(data?.skippedVariables || []).map((item) => item?.variable),
    ];
    return uniqueColumns([groupVar, ...attemptedVariables, ORDER_VARIABLE]);
  }, [groupVar, data]);

  useEffect(() => {
    setRanking(new RankingPlot(ref.current));
  }, []);

  useEffect(() => {
    if (!ranking) return;
    ranking.onVariableClick = onVariableClick;
  }, [ranking, onVariableClick]);

  useEffect(() => {
    if (ranking?.data && dimensions) {
      ranking.onResize(dimensions);
    }
  }, [dimensions, ranking]);

  useEffect(() => {
    if (!test || !groupVar || !config.isSync) {
      setData(null);
      return;
    }

    try {
      const result = computeRankingData({
        test,
        groupVar,
        selection,
        numericVars,
        categoricVars,
        hierarchy,
      });
      setData(result);

      const skipped = result?.skippedVariables ?? [];
      if (!skipped.length) {
        skippedSignatureRef.current = "";
        return;
      }

      const signature = skipped
        .map(({ variable, reason }) => `${variable}:${reason}`)
        .join("|");
      if (signature === skippedSignatureRef.current) {
        return;
      }
      skippedSignatureRef.current = signature;

      const maxItems = 8;
      const details = skipped
        .slice(0, maxItems)
        .map(({ variable, reason }) => `${variable}: ${reason}`)
        .join("\n");
      const extra =
        skipped.length > maxItems
          ? `\n...and ${skipped.length - maxItems} more.`
          : "";

      notifyWarning({
        message: "Ranking generated with skipped variables",
        description: `${skipped.length} variable(s) were excluded:\n${details}${extra}`,
        placement: "bottomRight",
        source: "test",
      });
    } catch (error) {
      console.error(error);
      notifyError({
        message: "Could not compute ranking data",
        error: error.message || String(error),
        fallback: "Ranking calculation failed.",
        placement: "bottomRight",
        source: "test",
      });
      setData(null);
    }
  }, [
    selection,
    groupVar,
    numericVars,
    categoricVars,
    test,
    config.isSync,
    hierarchy,
  ]);

  useEffect(() => {
    if (!ranking || !data?.data) return;
    ranking.measure = data.measure;
    ranking.data = data.data;
    ranking.config = config;
    ranking.updateVis();
  }, [data, config, ranking]);

  const skippedVariables = data?.skippedVariables ?? [];
  const hasRankingData = Boolean(data?.data?.length);
  const info = (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div>Test: {test || "-"}</div>
      <div>Ranking measure: {data?.measure || "-"}</div>
      <div>
        Variables included: {data?.includedVariables ?? data?.data?.length ?? 0}
        /{data?.totalVariables ?? data?.data?.length ?? 0}
      </div>

      {skippedVariables.length > 0 && (
        <>
          <div>Skipped variables ({skippedVariables.length}):</div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.2em",
              maxHeight: "180px",
              overflowY: "auto",
            }}
          >
            {skippedVariables.map(({ variable, reason }, idx) => (
              <li key={`${variable}-${idx}`}>
                {variable}: {reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
  const axisLabelFontSize = Number.isFinite(config?.axisLabelFontSize)
    ? config.axisLabelFontSize
    : null;
  const containerStyle =
    axisLabelFontSize != null
      ? { "--axis-label-font-size": `${axisLabelFontSize}px` }
      : undefined;

  return (
    <div className={styles.viewContainer} style={containerStyle}>
      <ChartBar
        title={`Ranking · ${test}`}
        info={info}
        svgIDs={data && [id]}
        remove={remove}
        config={config}
        setConfig={setConfig}
        settings={<Options config={config} setConfig={setConfig} />}
        recordsExport={{
          filename: `ranking_${test || "view"}`,
          recordOrders,
          requiredVariables,
        }}
      ></ChartBar>

      {!hasRankingData && <NoDataPlaceholder></NoDataPlaceholder>}

      <svg
        ref={ref}
        id={id}
        className={styles.chartSvg}
        style={{ display: hasRankingData ? "block" : "none" }}
      />
    </div>
  );
}

function Options({ config, setConfig }) {
  const { desc, nBars, pValue, showGrid } = config;
  const update = (field, value) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={panelStyles.panel}>
      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Ordering</div>
        <div className={panelStyles.controlInlineRow}>
          <Radio.Group
            className={panelStyles.radioGroupCompact}
            optionType="button"
            buttonStyle="solid"
            size="small"
            value={desc ? "desc" : "asc"}
            onChange={(e) => update("desc", e.target.value === "desc")}
          >
            <Radio.Button value="asc">Ascending</Radio.Button>
            <Radio.Button value="desc">Descending</Radio.Button>
          </Radio.Group>
        </div>
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Filters</div>
        <SliderControl
          label="p-value"
          valueLabel={pValue.toFixed(2)}
          min={0}
          max={1}
          step={0.01}
          value={pValue}
          onChange={(v) => update("pValue", v)}
        />
        <SliderControl
          label="Bars"
          valueLabel={`${nBars}`}
          min={1}
          max={50}
          step={1}
          value={nBars}
          onChange={(v) => update("nBars", v)}
        />
      </div>

      <div className={panelStyles.section}>
        <div className={panelStyles.sectionTitle}>Guides</div>
        <div className={panelStyles.row}>
          <Text className={panelStyles.label}>Grid lines</Text>
          <Switch
            size="small"
            checked={showGrid}
            onChange={(v) => update("showGrid", v)}
          />
        </div>
        <AxisLabelSizeControl config={config} setConfig={setConfig} />
      </div>
    </div>
  );
}

function SliderControl({ label, valueLabel, min, max, step, value, onChange }) {
  return (
    <div className={panelStyles.sliderInlineRow}>
      <Text className={panelStyles.label}>{label}</Text>
      <Text className={panelStyles.value}>{valueLabel}</Text>
      <Slider
        className={panelStyles.sliderInlineControl}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
