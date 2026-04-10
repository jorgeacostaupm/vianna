import {
  createStateSyncMiddleware,
  initStateWithPrevTab,
  withReduxStateSync,
} from "redux-state-sync";

const CHANNEL_NAME = "vianna_shared_state_channel";

const shouldSyncAction = (action) => {
  const type = action?.type;
  if (typeof type !== "string") return false;
  if (type.startsWith("@@")) return false;
  if (type.startsWith("&_")) return false;
  if (type.startsWith("notifications/")) return false;
  return true;
};

export const sharedStateSyncMiddleware = createStateSyncMiddleware({
  channel: CHANNEL_NAME,
  predicate: shouldSyncAction,
});

export const withSharedStateSyncReducer = (reducer) =>
  withReduxStateSync(reducer);

let hasInitializedSync = false;

export const initializeSharedStateSync = (store) => {
  if (!store || hasInitializedSync || typeof window === "undefined") return;
  hasInitializedSync = true;
  initStateWithPrevTab(store);
};
