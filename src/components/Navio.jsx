import React, { useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import navio from "@/vendor/navio";

import {
  selectNavioColumns,
  selectNavioScaleOverrides,
  setNavioScaleTypes,
} from "@/store/features/dataframe";
import { ORDER_VARIABLE } from "@/utils/constants";
import { GROUP_CATEGORICAL_PALETTE } from "@/utils/groupColors";

const areColumnsEqual = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

export default function Navio({
  data,
  config,
  setSelection,
  selectionPayloadMode = "rows",
  navioUiState,
  setNavioUiState,
  resetToken,
}) {
  const dispatch = useDispatch();
  const navioRef = useRef(null);
  const navioInstanceRef = useRef(null);
  const navioUiStateRef = useRef(navioUiState);
  const resetTokenRef = useRef(resetToken);
  const columns = useSelector(selectNavioColumns);
  const scaleOverrides = useSelector(selectNavioScaleOverrides);
  const columnsRef = useRef(columns);

  const emitNavioUiState = useCallback(() => {
    if (typeof setNavioUiState !== "function") return;

    const uiState = navioInstanceRef.current?.exportUiState?.() ?? null;
    dispatch(
      setNavioUiState(uiState ? JSON.parse(JSON.stringify(uiState)) : null),
    );
  }, [dispatch, setNavioUiState]);

  const handleSelection = useCallback(
    (selection) => {
      const payload =
        selectionPayloadMode === "orderValues"
          ? {
              orderValues: Array.isArray(selection)
                ? selection.map((row) => row?.[ORDER_VARIABLE])
                : [],
            }
          : JSON.parse(JSON.stringify(selection));

      dispatch(setSelection(payload));
      emitNavioUiState();
    },
    [dispatch, setSelection, emitNavioUiState, selectionPayloadMode],
  );

  useEffect(() => {
    navioUiStateRef.current = navioUiState;
  }, [navioUiState]);

  useEffect(() => {
    if (!data) return;

    const shouldResetState =
      resetToken !== undefined &&
      resetTokenRef.current !== undefined &&
      resetTokenRef.current !== resetToken;
    resetTokenRef.current = resetToken;
    const previousUiState = shouldResetState ? null : navioUiStateRef.current;
    const previousColumns = columnsRef.current;
    const hasExternalColumnOrderChange = !areColumnsEqual(
      previousColumns,
      columns,
    );
    columnsRef.current = columns;

    const nv = navio(navioRef.current, config.navioHeight);
    navioInstanceRef.current = nv;
    nv.attribWidth = config.attrWidth;
    nv.y0 = config.navioLabelHeight;
    nv.attribFontSize = 16;
    nv.attribFontSizeSelected = 18;
    nv.filterFontSize = 12;
    nv.tooltipFontSize = 14;
    nv.tooltipBgColor = "#fff";
    nv.nullColor = "#f5dd07";
    nv.defaultColorCategorical = [...GROUP_CATEGORICAL_PALETTE];
    nv.margin = 50;
    nv.tooltipMargin = 25;
    nv.id(ORDER_VARIABLE);
    nv.data(JSON.parse(JSON.stringify(data)));
    nv.updateCallback(handleSelection);
    nv.addAllAttribs(columns, scaleOverrides);
    dispatch(
      setNavioScaleTypes(
        buildNavioScaleTypeSummary(nv, columns, scaleOverrides),
      ),
    );
    restoreNavioState(nv, previousUiState, {
      restoreAttribOrder: !hasExternalColumnOrderChange,
    });
    emitNavioUiState();

    const innerDiv = navioRef.current.querySelector("div");
    if (innerDiv) {
      innerDiv.style.overflow = "visible";
    }

    return () => {
      if (!shouldResetState) emitNavioUiState();
      if (navioInstanceRef.current === nv) {
        navioInstanceRef.current = null;
      }
    };
  }, [
    data,
    config,
    columns,
    scaleOverrides,
    dispatch,
    handleSelection,
    emitNavioUiState,
    resetToken,
  ]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    >
      <div ref={navioRef} style={{ fontSize: 14 }} />
    </div>
  );
}

function buildNavioScaleTypeSummary(nv, columns, scaleOverrides) {
  const inferredByAttribute = new Map(
    (nv.inferAttribTypes?.(columns) || []).map((item) => [
      item.attribute,
      item.type,
    ]),
  );
  const effectiveByAttribute = new Map(
    (nv.getAttribScaleTypes?.() || []).map((item) => [
      item.attribute,
      item.type,
    ]),
  );

  return columns.map((attribute) => ({
    attribute,
    inferredType: inferredByAttribute.get(attribute) || null,
    effectiveType: effectiveByAttribute.get(attribute) || null,
    overrideType: scaleOverrides?.[attribute] || null,
  }));
}

function restoreNavioState(
  nv,
  previousUiState,
  { restoreAttribOrder = true } = {},
) {
  if (!previousUiState || typeof nv.importUiState !== "function") return;

  nv.importUiState(previousUiState, {
    shouldApply: true,
    restoreSort: true,
    restoreAttribOrder,
  });
}
