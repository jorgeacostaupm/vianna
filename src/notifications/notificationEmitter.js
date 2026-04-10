import { enqueueNotification } from "./store/notificationsSlice";
import { extractErrorMessage } from "./notificationUtils";

export const createNotificationEmitter = (emit) => {
  const notify = (payload = {}) => {
    emit(payload);
  };

  const notifyWithType = (type, payload = {}) => {
    notify({
      ...payload,
      type: payload.type || type,
    });
  };

  const notifyInfo = (payload = {}) => notifyWithType("info", payload);
  const notifySuccess = (payload = {}) => notifyWithType("success", payload);
  const notifyWarning = (payload = {}) => notifyWithType("warning", payload);
  const notifyError = ({
    error,
    description,
    fallback = "Unexpected error.",
    ...payload
  } = {}) => {
    notifyWithType("error", {
      ...payload,
      description: description ?? extractErrorMessage(error, fallback),
    });
  };

  return {
    notify,
    notifyInfo,
    notifySuccess,
    notifyWarning,
    notifyError,
  };
};

export const createDispatchNotificationEmitter = (dispatch) =>
  createNotificationEmitter((payload) => {
    dispatch(enqueueNotification(payload));
  });
