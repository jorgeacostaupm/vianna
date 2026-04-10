import { createListenerMiddleware } from "@reduxjs/toolkit";

import { createDispatchNotificationEmitter } from "@/notifications/notificationEmitter";
import { buildListResultDescription } from "@/notifications/notificationUtils";

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

const isType = (type) => (action) => action?.type === type;

const start = notificationsListenerMiddleware.startListening;

start({
  predicate: isType("metadata/setDescriptions"),
  effect: async (_, listenerApi) => {
    notifySuccess(listenerApi, {
      message: "Descriptions imported",
    });
  },
});

start({
  predicate: isType("attributes/changeRelationship/rejected"),
  effect: async (action, listenerApi) => {
    const isSilent = Boolean(action.meta?.arg?.silent);
    if (isSilent) return;

    notifyError(listenerApi, {
      message: "Could not reassign node",
      error: action.payload || action.error,
      fallback: "Unable to update parent-child relation for the node.",
    });
  },
});

start({
  predicate: isType("attributes/changeRelationshipBatch/rejected"),
  effect: async (action, listenerApi) => {
    const isSilent = Boolean(action.meta?.arg?.silent);
    if (isSilent) return;

    notifyError(listenerApi, {
      message: "Could not reassign node selection",
      error: action.payload || action.error,
      fallback: "Unable to update parent-child relation for selected nodes.",
    });
  },
});

start({
  predicate: isType("metadata/updateHierarchy/fulfilled"),
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Hierarchy uploaded",
    });
  },
});

start({
  predicate: isType("metadata/updateHierarchy/rejected"),
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
  predicate: isType("metadata/buildMetaFromVariableTypes/rejected"),
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
  predicate: isType("metadata/createToMeta/rejected"),
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
  predicate: isType("metadata/removeAttribute/rejected"),
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
  predicate: isType("metadata/applyOperation/fulfilled"),
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
  predicate: isType("metadata/applyOperation/rejected"),
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
  predicate: isType("main/nulls-to-quarantine/rejected"),
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update quarantine data",
      error: action.payload || action.error,
      fallback: "Failed to move null values into quarantine.",
    });
  },
});

start({
  predicate: isType("dataframe/load-import/fulfilled"),
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Data updated",
    });
  },
});

start({
  predicate: isType("dataframe/load-import/rejected"),
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not update dataset",
      error: action.payload || action.error,
      fallback: "The dataset could not be processed.",
    });
  },
});

start({
  predicate: isType("metadata/updateDescriptions/fulfilled"),
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Descriptions updated",
    });
  },
});

start({
  predicate: isType("metadata/updateDescriptions/rejected"),
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
  predicate: isType("dataframe/agg-generate/fulfilled"),
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Aggregation created",
    });
  },
});

start({
  predicate: isType("dataframe/agg-generate/rejected"),
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
  predicate: isType("dataframe/agg-generate-batch/fulfilled"),
  effect: async (action, listenerApi) => {
    if (action.meta?.arg?.silentSuccess) return;

    notifySuccess(listenerApi, {
      message: "Aggregations computed",
    });
  },
});

start({
  predicate: isType("dataframe/agg-generate-batch/rejected"),
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not compute aggregations",
      error: action.payload || action.error,
      fallback: "Batch aggregation failed.",
    });
  },
});

start({
  predicate: isType("dataframe/replaceValuesWithNull/rejected"),
  effect: async (action, listenerApi) => {
    notifyError(listenerApi, {
      message: "Could not nullify values",
      error: action.payload || action.error,
      fallback: "Failed to replace selected values with null.",
    });
  },
});

start({
  predicate: isType("metadata/updateAttribute/fulfilled"),
  effect: async (action, listenerApi) => {
    notifySuccess(listenerApi, {
      message: `Attribute ${action.payload?.node?.name || "attribute"} updated`,
    });
  },
});

start({
  predicate: isType("metadata/updateAttribute/rejected"),
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
  predicate: isType("main/loadDemoData/fulfilled"),
  effect: async (_, listenerApi) => {
    notifySuccess(listenerApi, {
      message: "Demo data loaded",
    });
  },
});

start({
  predicate: isType("main/loadDemoData/rejected"),
  effect: async (action, listenerApi) => {
    if (typeof action.payload === "string") return;

    notifyError(listenerApi, {
      message: "Could not load demo data",
      error: action.payload || action.error,
      fallback: "An error occurred while loading demo files.",
    });
  },
});

start({
  predicate: isType("compare/runAllComparisonTests/rejected"),
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
  predicate: isType("compare/runTest/rejected"),
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
