import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ToasterProvider from "./components/ToasterProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToasterProvider />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
