import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardFooter from "./DashboardFooter";
import EchoModal from "./EchoModal";
import EchoOrb from "./EchoOrb";
import { DEFAULT_PUBLIC_UI_CONFIG, fetchPublicUiConfig } from "../utils/publicUiConfig";

const PublicPageWidgets = ({
  hideFooter = false,
  footerMode = "flow",
  footerClassName = "mt-12",
  echoClassName = "",
}) => {
  const [showEcho, setShowEcho] = useState(false);
  const [config, setConfig] = useState(DEFAULT_PUBLIC_UI_CONFIG);
  const { currentUser } = useAuth();

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        const nextConfig = await fetchPublicUiConfig();
        if (!mounted) return;
        setConfig(nextConfig);
      } catch (error) {
        console.error("Failed to load public widget config:", error.message);
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const widgets = config?.widgets || DEFAULT_PUBLIC_UI_CONFIG.widgets;

  return (
    <>
      {widgets.echoEnabled ? (
        <EchoOrb onClick={() => setShowEcho(true)} className={echoClassName} />
      ) : null}
      <EchoModal
        open={showEcho}
        onClose={() => setShowEcho(false)}
        role="public"
        userName={currentUser?.name || "Guest"}
      />
      {!hideFooter ? (
        <DashboardFooter config={widgets} mode={footerMode} className={footerClassName} />
      ) : null}
    </>
  );
};

export default PublicPageWidgets;
