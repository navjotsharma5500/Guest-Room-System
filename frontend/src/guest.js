import React from "react";
import ReactDOM from "react-dom/client";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import "./index.css"; // your tailwind/global CSS

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GuestEnquiryPage />
  </React.StrictMode>
);
