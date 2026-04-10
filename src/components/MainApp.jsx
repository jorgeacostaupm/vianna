import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Layout } from "antd";
import GridLayout, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import AppBar from "@/components/ui/AppBar";
import AppsButtons from "./AppsButtons";
import OverviewApp from "./old/Overview/OverviewApp";
import styles from "@/styles/App.module.css";
import { setInit } from "@/store/features/main";
import { APP_NAME, APP_DESC } from "@/utils/Constants";
import { notifyError } from "@/notifications";

const ResponsiveGridLayout = WidthProvider(GridLayout);

const layout = [{ i: "explorer", x: 0, y: 0, w: 12, h: 7 }];

export default function MainApp() {
  const dispatch = useDispatch();

  useRootStyles(setInit, APP_NAME);

  useEffect(() => {
    loadTestData(dispatch);
  }, [dispatch]);

  return (
    <>
      <Layout className={styles.fullScreenLayout}>
        <AppBar description={APP_DESC}>
          <AppsButtons />
        </AppBar>

        <ResponsiveGridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={100}
          isDraggable={false}
        >
          <div key={"explorer"}>
            <OverviewApp />
          </div>
        </ResponsiveGridLayout>
      </Layout>
    </>
  );
}

const idVar = "id";
const groupVar = "Country";
const timeVar = "Visit Name";

const largeData = "./vis/csv/largeTestData.csv";

const largeHierarchy = "./vis/hierarchies/largeTestDatahierarchy.json";

const hierarchyFile = largeHierarchy;
const dataFile = largeData;

// TEST DATA LOADING
import { updateData } from "@/store/features/dataframe";
import { updateHierarchy } from "@/store/features/metadata";
import * as api from "@/services/mainAppServices";
import { setGroupVar, setIdVar, setTimeVar } from "@/store/features/main";
import useRootStyles from "@/hooks/useRootStyles";

async function loadTestData(dispatch) {
  try {
    let data = await api.fetchTestData(dataFile);

    await dispatch(
      updateData({ data, isGenerateHierarchy: true, filename: "Test data" })
    );

    let hierarchy = await api.fetchHierarchy(hierarchyFile);
    await dispatch(
      updateHierarchy({
        hierarchy,
        filename: "Test Hierarchy",
        silentSuccess: true,
      }),
    );

    dispatch(setIdVar(idVar));
    dispatch(setGroupVar(groupVar));
    dispatch(setTimeVar(timeVar));
  } catch (error) {
    notifyError({
      message: "Could not load test data",
      error,
      fallback: "An error occurred while loading demo files.",
    });
  }
}
