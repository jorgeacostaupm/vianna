import { DATASETS, ORDER_VARIABLE } from "@/utils/constants";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { setDataframe } from "../dataframe/slice";
import { updateData } from "../dataframe/thunks";
import { updateDescriptions, updateHierarchy } from "../metadata/thunks";
import { getMissingOrderValuesInSelection } from "../dataframe/utils/missingValues";
import {
  fetchDescriptionsCSV,
  fetchHierarchy,
  fetchTestData,
} from "./utils/services";

const { dataPath, hierarchyPath, descriptionsPath, idVar } = import.meta.env
  .PROD
  ? DATASETS.prod
  : DATASETS.dev;

export const loadDemoData = createAsyncThunk(
  "main/loadDemoData",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const [data, hierarchy, descriptions] = await Promise.all([
        fetchTestData(dataPath),
        fetchHierarchy(hierarchyPath),
        fetchDescriptionsCSV(descriptionsPath),
      ]);

      await dispatch(
        updateData({
          data,
          isGenerateHierarchy: true,
          filename: dataPath,
          silentSuccess: true,
        }),
      ).unwrap();

      await dispatch(
        updateHierarchy({
          hierarchy,
          filename: hierarchyPath,
          silentSuccess: true,
        }),
      ).unwrap();

      await dispatch(
        updateDescriptions({
          descriptions,
          filename: descriptionsPath,
          silentSuccess: true,
        }),
      ).unwrap();

      return { idVar };
    } catch (error) {
      const isNestedThunkError = typeof error === "string";
      const message =
        error?.message ||
        (typeof error === "string" && error.trim().length > 0
          ? error
          : "Could not load demo data");

      return rejectWithValue({
        message,
        shouldNotify: !isNestedThunkError,
      });
    }
  },
);

export const nullsToQuarantine = createAsyncThunk(
  "main/nulls-to-quarantine",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const dataframeState = getState().dataframe;
      const originalDt = Array.isArray(dataframeState.dataframe)
        ? dataframeState.dataframe
        : [];
      const affectedOrderValues = getMissingOrderValuesInSelection({
        dataframe: originalDt,
        selectionRef: dataframeState.selectionRef,
        missingByAttribute: dataframeState.missingByAttribute,
        attributeIds: dataframeState.navioColumns,
      });

      if (affectedOrderValues.length === 0) return { quarantineData: [] };

      const affectedSet = new Set(affectedOrderValues);
      const data = originalDt.filter(
        (row) => !affectedSet.has(row?.[ORDER_VARIABLE]),
      );
      dispatch(setDataframe(data));

      const quarantineData = originalDt.filter((row) =>
        affectedSet.has(row?.[ORDER_VARIABLE]),
      );

      return { quarantineData };
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating values");
    }
  },
);
