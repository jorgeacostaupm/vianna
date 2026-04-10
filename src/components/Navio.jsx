import React, { useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import navio from "@/vendor/navio";
import * as d3 from "d3";

import { selectNavioColumns } from "@/store/features/main";
import { ORDER_VARIABLE } from "@/utils/Constants";

const TABLEAU_YELLOW = "#edc949";
const NAVIO_PASTEL_CATEGORICAL = [
  ...d3.schemeTableau10.filter((color) => color !== TABLEAU_YELLOW),
  TABLEAU_YELLOW,
];

export default function Navio({
  data,
  config,
  setSelection,
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
  const columnsRef = useRef(columns);

  const emitNavioUiState = useCallback(() => {
    if (typeof setNavioUiState !== "function") return;

    const uiState = navioInstanceRef.current?.exportUiState?.() ?? null;
    dispatch(setNavioUiState(uiState ? JSON.parse(JSON.stringify(uiState)) : null));
  }, [dispatch, setNavioUiState]);

  const handleSelection = useCallback(
    (selection) => {
      dispatch(setSelection(JSON.parse(JSON.stringify(selection))));
      emitNavioUiState();
    },
    [dispatch, setSelection, emitNavioUiState],
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

    const didColumnsChange = !areColumnsEqual(columnsRef.current, columns);
    columnsRef.current = columns;

    const previousUiState = shouldResetState ? null : navioUiStateRef.current;

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
    nv.defaultColorCategorical = NAVIO_PASTEL_CATEGORICAL;
    nv.margin = 50;
    nv.tooltipMargin = 25;
    nv.id(ORDER_VARIABLE);
    nv.data(JSON.parse(JSON.stringify(data)));
    nv.updateCallback(handleSelection);
    nv.addAllAttribs(columns);
    restoreNavioState(nv, previousUiState, {
      restoreAttribOrder: !didColumnsChange,
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
  }, [data, config, columns, handleSelection, emitNavioUiState, resetToken]);

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

function restoreNavioState(
  nv,
  previousUiState,
  options = {},
) {
  if (!previousUiState || typeof nv.importUiState !== "function") return;

  nv.importUiState(previousUiState, {
    shouldApply: true,
    restoreSort: true,
    restoreAttribOrder:
      options.restoreAttribOrder !== undefined
        ? options.restoreAttribOrder
        : true,
  });
}

function areColumnsEqual(previousColumns = [], nextColumns = []) {
  if (previousColumns === nextColumns) return true;
  if (!Array.isArray(previousColumns) || !Array.isArray(nextColumns)) {
    return false;
  }
  if (previousColumns.length !== nextColumns.length) return false;
  return previousColumns.every((column, index) => column === nextColumns[index]);
}
