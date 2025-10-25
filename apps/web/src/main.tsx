import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
