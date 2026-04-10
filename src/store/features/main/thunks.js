import { DATASETS, ORDER_VARIABLE } from "@/utils/Constants";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { setDataframe } from "../dataframe/slice";
import { pickColumns } from "@/utils/functions";
import { getDistinctValues } from "@/store/utils/collections";
import { updateData } from "../dataframe/thunks";
import { updateDescriptions, updateHierarchy } from "../metadata/thunks";
import * as api from "@/services/mainAppServices";

const { dataPath, hierarchyPath, descriptionsPath, idVar } = import.meta.env
  .PROD
  ? DATASETS.prod
  : DATASETS.dev;

export const setTimeVar = createAsyncThunk(
  "main/setTimeVar",
  async (timeVar, { getState }) => {
    const dataframe = getState().dataframe.dataframe;
    return {
      timeVar,
      timestamps: getDistinctValues(dataframe, timeVar),
    };
  },
);

export const setGroupVar = createAsyncThunk(
  "main/setGroupVar",
  async (groupVar, { getState }) => {
    const dataframe = getState().dataframe.dataframe;
    return {
      groupVar,
      groups: getDistinctValues(dataframe, groupVar),
    };
  },
);

export const setIdVar = createAsyncThunk(
  "main/setIdVar",
  async (nextIdVar, { getState }) => {
    const dataframe = getState().dataframe.dataframe;
    return {
      idVar: nextIdVar,
      ids: getDistinctValues(dataframe, nextIdVar),
    };
  },
);

export const loadDemoData = createAsyncThunk(
  "main/loadDemoData",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const [data, hierarchy, descriptions] = await Promise.all([
        api.fetchTestData(dataPath),
        api.fetchHierarchy(hierarchyPath),
        api.fetchDescriptionsCSV(descriptionsPath),
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

      await dispatch(setIdVar(idVar)).unwrap();

      return true;
    } catch (error) {
      return rejectWithValue(
        error?.message || error || "Could not load demo data",
      );
    }
  },
);

export const nullsToQuarantine = createAsyncThunk(
  "main/nulls-to-quarantine",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const originalDt = getState().dataframe.dataframe;
      const cols = getState().dataframe.navioColumns;

      const visibleData = pickColumns(originalDt, cols);

      const idsWithNull = visibleData.filter((row) =>
        Object.values(row).some(
          (value) =>
            value === null ||
            value === undefined ||
            (typeof value === "number" && isNaN(value)),
        ),
      );

      if (idsWithNull.length === 0) return;

      const data = originalDt.filter(
        (row) =>
          !idsWithNull.some((r) => r[ORDER_VARIABLE] === row[ORDER_VARIABLE])
      );
      dispatch(setDataframe(data));

      const quarantineData = originalDt.filter((row) =>
        idsWithNull.some((r) => r[ORDER_VARIABLE] === row[ORDER_VARIABLE])
      );

      return { quarantineData };
    } catch (error) {
      console.error(error);
      return rejectWithValue("Error aggregating values");
    }
  },
);
