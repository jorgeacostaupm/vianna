import { createNotificationEmitter } from "./notificationEmitter";
import { emitNotification } from "./store/notificationDispatchBridge";

const notificationEmitter = createNotificationEmitter(emitNotification);

export const { notify, notifyInfo, notifySuccess, notifyWarning, notifyError } =
  notificationEmitter;

export {
  extractErrorMessage,
  formatListPreview,
  buildListResultDescription,
} from "./notificationUtils";
