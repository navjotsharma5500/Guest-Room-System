import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext"; 
import ImageKitProvider from "./providers/ImageKitProvider";

// 🔒 Hide browser console logs in production (frontend only)
if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>                                  
        <ImageKitProvider>
          <App />
        </ImageKitProvider>
      </ToastProvider>                                  
    </AuthProvider>
  </React.StrictMode>
);