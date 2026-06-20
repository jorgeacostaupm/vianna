import React from "react";
import { createRoot } from "react-dom/client";
import { initializeStoreSync } from "@/store/store";
import App from "./App";
import "@/styles/index.css";
import { applyUiColorVariables } from "@/styles/uiColors";

applyUiColorVariables();

async function bootstrap() {
  try {
    await initializeStoreSync();
  } catch (error) {
    console.error("Store bootstrap failed:", error);
  }

  const container = document.getElementById("root");

  if (!container) {
    throw new Error("Root element not found");
  }

  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
