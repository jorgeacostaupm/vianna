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

start({
  type: "metadata/setDescriptions",
  effect: async (_, listenerApi) => {
    notifySuccess(listenerApi, {
      message: "Descriptions imported",
    });
  },
});

start({
  type: "metadata/updateHierarchy/fulfilled",
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Hierarchy uploaded",
    });
  },
});

start({
  type: "metadata/updateHierarchy/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update hierarchy",
      error: action.payload || action.error,
      fallback: "Hierarchy update failed.",
      pauseOnHover: true,
    });
  },
});

start({
  type: "metadata/buildMetaFromVariableTypes/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Import Hierarchy Failure",
      error: action.payload || action.error,
      fallback: "Failed to import hierarchy.",
      pauseOnHover: true,
    });
  },
});

start({
  type: "metadata/createToMeta/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Failure to Save Created Hierarchy",
      error: action.payload || action.error,
      fallback: "Failed to save generated hierarchy.",
      pauseOnHover: true,
    });
  },
});

start({
  type: "metadata/removeAttribute/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not remove node",
      error: action.payload || action.error,
      fallback: "Node removal failed.",
      pauseOnHover: true,
    });
  },
});

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

start({
  type: "metadata/applyOperation/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Operation failed",
      error: action.payload || action.error,
      fallback: "Error applying operation to selected nodes.",
      pauseOnHover: true,
    });
  },
});

start({
  type: "main/nulls-to-quarantine/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update quarantine data",
      error: action.payload || action.error,
      fallback: "Failed to move null values into quarantine.",
    });
  },
});

start({
  type: "dataframe/load-import/fulfilled",
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Data updated",
    });
  },
});

start({
  type: "dataframe/load-import/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update dataset",
      error: action.payload || action.error,
      fallback: "The dataset could not be processed.",
    });
  },
});

start({
  type: "metadata/updateDescriptions/fulfilled",
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Descriptions updated",
    });
  },
});

start({
  type: "metadata/updateDescriptions/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update descriptions",
      error: action.payload || action.error,
      fallback: "Description update failed.",
      pauseOnHover: true,
    });
  },
});

start({
  type: "dataframe/agg-generate/fulfilled",
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Aggregation created",
    });
  },
});

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

start({
  type: "dataframe/agg-generate-batch/fulfilled",
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Aggregations computed",
    });
  },
});

start({
  type: "dataframe/agg-generate-batch/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not compute aggregations",
      error: action.payload || action.error,
      fallback: "Batch aggregation failed.",
    });
  },
});

start({
  type: "dataframe/replaceValuesWithNull/rejected",
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not nullify values",
      error: action.payload || action.error,
      fallback: "Failed to replace selected values with null.",
    });
  },
});

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

start({
  type: "main/loadDemoData/fulfilled",
  effect: async (_, listenerApi) => {
    notifySuccess(listenerApi, {
      message: "Demo data loaded",
    });
  },
});

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

start({
  type: "compare/runAllComparisonTests/rejected",
  effect: async (action, listenerApi) => {
    const error = action.payload || action.error?.message;

    notifyError(listenerApi, {
      message: "Could not run test for all variables",
      error,
      fallback: "Failed to execute ranking test for selected variables.",
      source: "test",
    });
  },
});

start({
  type: "compare/runTest/rejected",
  effect: async (action, listenerApi) => {
    const error = action.payload || action.error?.message;

    notifyError(listenerApi, {
      message: "Could not run selected test",
      error,
      fallback: "Failed to execute the selected test.",
      source: "test",
    });
  },
});

export default notificationsListenerMiddleware;
