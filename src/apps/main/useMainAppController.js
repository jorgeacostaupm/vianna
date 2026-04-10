import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { loadDemoData } from "@/store/features/main";
import {
  selectHasMainData,
  selectIsDemoLoading,
} from "@/store/features/main";

export default function useMainAppController() {
  const dispatch = useDispatch();
  const hasData = useSelector(selectHasMainData);
  const isLoadingDemo = useSelector(selectIsDemoLoading);
  const [isChoiceDismissed, setIsChoiceDismissed] = useState(false);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);

  const shouldShowInitialChoice = useMemo(
    () => (!isChoiceDismissed && !hasData) || isLoadingDemo,
    [isChoiceDismissed, hasData, isLoadingDemo],
  );

  const handleDataManagementOpenChange = useCallback((isOpen) => {
    setIsDataManagementOpen(Boolean(isOpen));
  }, []);

  const handleLoadDemo = useCallback(async () => {
    setIsDataManagementOpen(false);
    try {
      await dispatch(loadDemoData()).unwrap();
      setIsChoiceDismissed(true);
    } catch {
      // Errors are already notified by Redux async actions.
    }
  }, [dispatch]);

  const handleLoadMyData = useCallback(() => {
    setIsChoiceDismissed(true);
    setIsDataManagementOpen(true);
  }, []);

  const handleContinueWithoutData = useCallback(() => {
    setIsChoiceDismissed(true);
    setIsDataManagementOpen(false);
  }, []);

  return {
    shouldShowInitialChoice,
    isLoadingDemo,
    isDataManagementOpen,
    onDataManagementOpenChange: handleDataManagementOpenChange,
    onLoadDemo: handleLoadDemo,
    onLoadMyData: handleLoadMyData,
    onContinueWithoutData: handleContinueWithoutData,
  };
}
