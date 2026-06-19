import mainReducer from "./features/main";
import compareReducer from "./features/compare";
import evolutionReducer from "./features/evolution";
import correlationReducer from "./features/correlation";
import dataReducer from "./features/dataframe";
import metaReducer from "./features/metadata";
import notificationsReducer from "@/components/notifications/store/notificationsSlice";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  initializeSharedStateSync,
  sharedStateSyncMiddleware,
  withSharedStateSyncReducer,
} from "./middleware/sharedStateSync";
import notificationsListenerMiddleware from "@/components/notifications/store/notificationsListenerMiddleware";
import { registerNotificationDispatch } from "@/components/notifications/store/notificationDispatchBridge";
import {
  RESTORE_WORKSPACE_ACTION,
  applyWorkspaceState,
  createWorkspaceSnapshot,
  saveAutosaveWorkspace,
} from "@/workspace/workspace";

const baseReducer = combineReducers({
  main: mainReducer,
  compare: compareReducer,
  evolution: evolutionReducer,
  correlation: correlationReducer,
  metadata: metaReducer,
  dataframe: dataReducer,
  notifications: notificationsReducer,
});

const appReducer = (state, action) => {
  if (action?.type === RESTORE_WORKSPACE_ACTION) {
    return baseReducer(applyWorkspaceState(state, action.payload), {
      type: "@@workspace/restored",
    });
  }

  return baseReducer(state, action);
};

const reducer = withSharedStateSyncReducer(appReducer);

const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
      immutableStateInvariant: false,
    })
      .prepend(notificationsListenerMiddleware.middleware)
      .concat(sharedStateSyncMiddleware),
});

registerNotificationDispatch(store.dispatch);

let syncInitializationPromise = null;

export const initializeStoreSync = () => {
  if (!syncInitializationPromise) {
    syncInitializationPromise = Promise.resolve(
      initializeSharedStateSync(store),
    );
  }
  return syncInitializationPromise;
};

let autosaveTimer = null;

const scheduleWorkspaceAutosave = () => {
  if (typeof window === "undefined") return;
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    const route = window.location?.hash || "#/";
    saveAutosaveWorkspace(createWorkspaceSnapshot(store.getState(), route));
  }, 800);
};

store.subscribe(scheduleWorkspaceAutosave);

export default store;
