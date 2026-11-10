import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";
import { LocalDataGate } from "@/components/LocalDataGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster position="top-right" richColors />
    <LocalDataGate>
      <App />
    </LocalDataGate>
  </StrictMode>,
);
