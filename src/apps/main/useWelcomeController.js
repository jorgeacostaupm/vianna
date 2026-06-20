import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { notifyError, notifySuccess } from "@/components/notifications";
import { APP_NAV } from "@/navigation/apps";
import { loadDemoData, selectIsDemoLoading } from "@/store/features/main";
import {
  getWorkspaceSummary,
  loadAutosaveWorkspace,
  readWorkspaceFile,
  restoreWorkspace,
} from "@/workspace/workspace";

const OVERVIEW_PATH = `/${APP_NAV.overview.path}`;

export default function useWelcomeController() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoadingDemo = useSelector(selectIsDemoLoading);
  const [autosavedWorkspace, setAutosavedWorkspace] = useState(null);

  useEffect(() => {
    let isMounted = true;
    loadAutosaveWorkspace()
      .then((workspace) => {
        if (isMounted) setAutosavedWorkspace(workspace);
      })
      .catch(() => {
        if (isMounted) setAutosavedWorkspace(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const navigateToWorkspace = useCallback(
    (workspace) => navigate(workspace?.route?.replace(/^#/, "") || OVERVIEW_PATH),
    [navigate],
  );

  const onLoadDemo = useCallback(async () => {
    try {
      await dispatch(loadDemoData()).unwrap();
      navigate(OVERVIEW_PATH);
    } catch {
      // Errors are already notified by Redux async actions.
    }
  }, [dispatch, navigate]);

  const onRestoreAutosave = useCallback(() => {
    if (!autosavedWorkspace) return;
    dispatch(restoreWorkspace(autosavedWorkspace));
    navigateToWorkspace(autosavedWorkspace);
    notifySuccess({
      message: "Workspace restored",
      description: "Autosaved session was restored.",
    });
  }, [autosavedWorkspace, dispatch, navigateToWorkspace]);

  const onLoadWorkspace = useCallback(
    async (file) => {
      if (!file) return;
      try {
        const workspace = await readWorkspaceFile(file);
        dispatch(restoreWorkspace(workspace));
        navigateToWorkspace(workspace);
        notifySuccess({
          message: "Workspace loaded",
          description: "Workspace state was restored.",
        });
      } catch (error) {
        notifyError({
          message: "Could not load workspace",
          error,
          fallback: "Workspace import failed. Verify the JSON file.",
        });
      }
    },
    [dispatch, navigateToWorkspace],
  );

  return {
    isLoadingDemo,
    onLoadDemo,
    onRestoreAutosave,
    onLoadWorkspace,
    onStartWithData: () =>
      navigate(OVERVIEW_PATH, { state: { openDataManagement: true } }),
    onContinueWithoutData: () => navigate(OVERVIEW_PATH),
    autosavedWorkspaceSummary: autosavedWorkspace
      ? getWorkspaceSummary(autosavedWorkspace)
      : null,
  };
}
