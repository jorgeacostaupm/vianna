import { useEffect, useRef } from "react";
import { notification } from "antd";
import { useDispatch, useSelector } from "react-redux";

import {
  dequeueNotification,
  selectNotificationQueue,
} from "@/notifications/store/notificationsSlice";
import { normalizeNotificationDescription } from "@/notifications/notificationUtils";

export default function NotificationHost() {
  const [api, holder] = notification.useNotification();
  const dispatch = useDispatch();
  const queue = useSelector(selectNotificationQueue);
  const openedNotifications = useRef(new Set());

  useEffect(() => {
    if (!Array.isArray(queue) || queue.length === 0) return;

    queue.forEach((entry) => {
      if (!entry?.id || openedNotifications.current.has(entry.id)) return;

      openedNotifications.current.add(entry.id);
      const normalizedDescription = normalizeNotificationDescription(
        entry.description,
      );

      api.open({
        message: entry.message || "Notification",
        description: (
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              whiteSpace: "pre-line",
            }}
          >
            {normalizedDescription}
          </div>
        ),
        type: entry.type || "info",
        placement: entry.placement || "bottomRight",
        duration: entry.duration ?? (entry.type === "error" ? 7 : 3),
        pauseOnHover:
          entry.pauseOnHover ??
          (entry.source === "test" || entry.type === "error"),
        showProgress: entry.showProgress ?? entry.type === "error",
        style: {
          whiteSpace: "pre-line",
        },
        onClose: () => {
          openedNotifications.current.delete(entry.id);
        },
      });

      dispatch(dequeueNotification(entry.id));
    });
  }, [api, dispatch, queue]);

  return holder;
}
