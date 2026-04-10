import React from "react";

import useRootStyles from "@/hooks/useRootStyles";
import { APP_NAME } from "@/utils/Constants";

import { setInit } from "@/store/features/main";
import MainAppView from "./MainAppView";
import useMainAppController from "./useMainAppController";

export default function MainApp() {
  useRootStyles(setInit, APP_NAME);
  const mainViewModel = useMainAppController();

  return (
    <>
      <MainAppView {...mainViewModel} />
    </>
  );
}
