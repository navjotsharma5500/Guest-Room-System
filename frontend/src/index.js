import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import ImageKitProvider from "./providers/ImageKitProvider";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ImageKitProvider>
        <App />
      </ImageKitProvider>
    </AuthProvider>
  </React.StrictMode>
);
