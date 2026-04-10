import mainReducer from "./features/main";
import compareReducer from "./features/compare";
import evolutionReducer from "./features/evolution";
import correlationReducer from "./features/correlation";
import dataReducer from "./features/dataframe";
import metaReducer from "./features/metadata";
import notificationsReducer from "@/notifications/store/notificationsSlice";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  initializeSharedStateSync,
  sharedStateSyncMiddleware,
  withSharedStateSyncReducer,
} from "./middleware/sharedStateSync";
import notificationsListenerMiddleware from "@/notifications/store/notificationsListenerMiddleware";
import { registerNotificationDispatch } from "@/notifications/store/notificationDispatchBridge";

const baseReducer = combineReducers({
  main: mainReducer,
  compare: compareReducer,
  evolution: evolutionReducer,
  correlation: correlationReducer,
  metadata: metaReducer,
  dataframe: dataReducer,
  notifications: notificationsReducer,
});

const reducer = withSharedStateSyncReducer(baseReducer);

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

export default store;
