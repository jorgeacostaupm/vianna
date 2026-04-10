import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  queue: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    enqueueNotification: {
      reducer: (state, action) => {
        state.queue.push(action.payload);
      },
      prepare: (payload = {}) => ({
        payload: {
          id: payload.id || nanoid(),
          ...payload,
        },
      }),
    },
    dequeueNotification: (state, action) => {
      const id = action.payload;

      if (id == null) {
        state.queue.shift();
        return;
      }

      state.queue = state.queue.filter((notification) => notification.id !== id);
    },
    clearNotifications: (state) => {
      state.queue = [];
    },
  },
});

export const { enqueueNotification, dequeueNotification, clearNotifications } =
  notificationsSlice.actions;

export const selectNotificationQueue = (state) =>
  state.notifications?.queue || [];

export default notificationsSlice.reducer;
