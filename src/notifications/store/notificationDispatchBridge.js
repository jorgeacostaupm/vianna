import { enqueueNotification } from "./notificationsSlice";

let dispatchRef = null;
const pendingNotifications = [];

export const registerNotificationDispatch = (dispatch) => {
  dispatchRef = dispatch;

  if (pendingNotifications.length === 0) return;

  const queued = pendingNotifications.splice(0, pendingNotifications.length);
  queued.forEach((payload) => {
    dispatchRef(enqueueNotification(payload));
  });
};

export const emitNotification = (payload = {}) => {
  if (dispatchRef) {
    dispatchRef(enqueueNotification(payload));
    return;
  }

  pendingNotifications.push(payload);
};
