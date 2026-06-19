import { createListenerMiddleware } from "@reduxjs/toolkit";

import { createDispatchNotificationEmitter } from "@/components/notifications/notificationEmitter";
import { buildListResultDescription } from "@/components/notifications/notificationUtils";

const notificationsListenerMiddleware = createListenerMiddleware();

const createListenerNotifier = (listenerApi) =>
  createDispatchNotificationEmitter(listenerApi.dispatch);

const notify = (listenerApi, payload = {}) => {
  createListenerNotifier(listenerApi).notify(payload);
};

const notifySuccess = (listenerApi, payload = {}) => {
  createListenerNotifier(listenerApi).notifySuccess(payload);
};

const notifyInfo = (listenerApi, payload = {}) => {
  createListenerNotifier(listenerApi).notifyInfo(payload);
};

const notifyError = (listenerApi, payload = {}) => {
  createListenerNotifier(listenerApi).notifyError(payload);
};

const isUserCanceledAction = (payload, error) => {
  const message = String(
    payload?.error || payload?.message || payload || error?.message || "",
  ).toLowerCase();
  return message.includes("canceled by user");
};

const toOperationNodeLabel = (node) => {
  return node?.name || node?.aggregationName || "Unknown node";
};

const toOperationFailureLabel = (entry) => {
  const base = toOperationNodeLabel(entry);
  if (!entry?.reason) return base;
  return `${base}: ${entry.reason}`;
};

const start = notificationsListenerMiddleware.startListening;

const listenForSuccess = (type, message, silent = false) =>
  start({
    type,
    effect: async (action, listenerApi) => {
      if (silent && action.meta?.arg?.silentSuccess) return;
      notifySuccess(listenerApi, { message });
    },
  });

const listenForError = (type, message, fallback, pauseOnHover = false) =>
  start({
    type,
    effect: async (action, listenerApi) => {
      notifyError(listenerApi, {
        message,
        error: action.payload || action.error,
        fallback,
        pauseOnHover,
      });
    },
  });

listenForSuccess("metadata/setDescriptions", "Descriptions imported");
listenForSuccess("metadata/updateHierarchy/fulfilled", "Hierarchy uploaded", true);
listenForError("metadata/updateHierarchy/rejected", "Could not update hierarchy", "Hierarchy update failed.", true);
listenForError("metadata/buildMetaFromVariableTypes/rejected", "Import Hierarchy Failure", "Failed to import hierarchy.", true);
listenForError("metadata/createToMeta/rejected", "Failure to Save Created Hierarchy", "Failed to save generated hierarchy.", true);
listenForError("metadata/removeAttribute/rejected", "Could not remove node", "Node removal failed.", true);

start({
  type: "metadata/applyOperation/fulfilled",
  effect: async (action, listenerApi) => {
    const { total = 0, applied = [], failed = [] } = action.payload || {};

    if (failed.length === 0) {
      notifySuccess(listenerApi, {
        message: `Operation applied to ${applied.length} node${applied.length === 1 ? "" : "s"}.`,
      });
      return;
    }

    const description = buildListResultDescription({
      successLabel: `Created (${applied.length}/${total})`,
      successItems: applied.map(toOperationNodeLabel),
      failureLabel: `Failed (${failed.length}/${total})`,
      failureItems: failed.map(toOperationFailureLabel),
      maxItems: 5,
    });

    notify(listenerApi, {
      message:
        applied.length === 0
          ? "Operation failed for selection"
          : "Operation completed with warnings",
      description,
      type: applied.length === 0 ? "error" : "warning",
      pauseOnHover: true,
      duration: 6,
    });
  },
});

listenForError("metadata/applyOperation/rejected", "Operation failed", "Error applying operation to selected nodes.", true);
listenForError("main/nulls-to-quarantine/rejected", "Could not update quarantine data", "Failed to move null values into quarantine.");
listenForSuccess("dataframe/load-import/fulfilled", "Data updated", true);
listenForError("dataframe/load-import/rejected", "Could not update dataset", "The dataset could not be processed.");
listenForSuccess("metadata/updateDescriptions/fulfilled", "Descriptions updated", true);
listenForError("metadata/updateDescriptions/rejected", "Could not update descriptions", "Description update failed.", true);
listenForSuccess("dataframe/agg-generate/fulfilled", "Aggregation created", true);

start({
  type: "dataframe/agg-generate/rejected",
  effect: async (action, listenerApi) => {
    if (isUserCanceledAction(action.payload, action.error)) {
      notifyInfo(listenerApi, {
        message: "Aggregation update canceled",
      });
      return;
    }

    notifyError(listenerApi, {
      message: "Could not compute aggregation",
      error: action.payload || action.error,
      fallback: "Aggregation column generation failed.",
    });
  },
});

listenForSuccess("dataframe/agg-generate-batch/fulfilled", "Aggregations computed", true);
listenForError("dataframe/agg-generate-batch/rejected", "Could not compute aggregations", "Batch aggregation failed.");
listenForError("dataframe/replaceValuesWithNull/rejected", "Could not nullify values", "Failed to replace selected values with null.");

start({
  type: "metadata/updateAttribute/fulfilled",
  effect: async (action, listenerApi) => {
    notifySuccess(listenerApi, {
      message: `Attribute ${action.payload?.node?.name || "attribute"} updated`,
    });
  },
});

start({
  type: "metadata/updateAttribute/rejected",
  effect: async (action, listenerApi) => {
    if (isUserCanceledAction(action.payload, action.error)) {
      notifyInfo(listenerApi, {
        message: "Attribute update canceled",
      });
      return;
    }

    const nodeName = action.payload?.node?.name || "attribute";

    notifyError(listenerApi, {
      message: `Could not update ${nodeName}`,
      error: action.payload?.error || action.payload || action.error,
      fallback: `Update failed for ${nodeName}.`,
    });
  },
});

listenForSuccess("main/loadDemoData/fulfilled", "Demo data loaded");

start({
  type: "main/loadDemoData/rejected",
  effect: async (action, listenerApi) => {
    if (action.payload?.shouldNotify === false) return;

    notifyError(listenerApi, {
      message: "Could not load demo data",
      error: action.payload?.message || action.payload || action.error,
      fallback: "An error occurred while loading demo files.",
    });
  },
});

export default notificationsListenerMiddleware;
