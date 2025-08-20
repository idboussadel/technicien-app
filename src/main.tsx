import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ToasterProvider from "./components/ToasterProvider";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToasterProvider />
      <Toaster />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
