// src/context/ToastContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [soundEnabled, setSoundEnabled] = useState(
    JSON.parse(localStorage.getItem("toastSoundEnabled") || "true")
  );

  // 🎧 Simple sounds (tiny base64 audio beeps)
  const sounds = {
    success:
      "data:audio/wav;base64,UklGRr4AAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YV4AAAArDw+OPj4+Pz4+Pj4+PgAAAD4+Pj4+Pj4+Pj4+Pj4+Pg==",
    error:
      "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YYAAAAAAAAD8AAD/AAH/AAH/AAD/AAEAAAD/AAD/",
    warning:
      "data:audio/wav;base64,UklGRp4AAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YW4AAAAbEBAQDxAQEA8QEA8QEBAQEA8QEA8QEBAQEBA=",
    info:
      "data:audio/wav;base64,UklGRk4AAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YT4AAAAkDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8=",
  };

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    const audio = new Audio(sounds[type] || sounds.info);
    audio.volume = 0.3;
    audio.play().catch(() => {}); // ignore autoplay restriction errors
  }, [soundEnabled]);

  // ✅ Watch for SettingsPage toggle
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("toastSoundEnabled") || "true");
    setSoundEnabled(stored);
  }, []);

  // ✅ Observe theme change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const showToast = useCallback(
    (message, type = "info") => {
      // Check if notifications are enabled - must be explicitly "true"
      const notificationsEnabled = localStorage.getItem("notificationsEnabled");
      if (notificationsEnabled !== "true") return;

      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      playSound(type);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [playSound]
  );

  const removeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem
              key={t.id}
              toast={t}
              onDismiss={() => removeToast(t.id)}
              theme={theme}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// -------------------- INDIVIDUAL TOAST --------------------
function ToastItem({ toast, onDismiss, theme }) {
  const [progress, setProgress] = useState(100);
  const { message, type } = toast;
  const { bg, border, iconColor, glow } = getToastColors(type, theme);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p > 0 ? p - 2 : 0));
    }, 70);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      onClick={onDismiss}
      className={`relative pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-lg rounded-xl overflow-hidden 
        border-l-4 ${border} ${bg} ${glow} cursor-pointer`}
      style={{
        minWidth: "280px",
        maxWidth: "380px",
      }}
    >
      <span className={`w-5 h-5 ${iconColor}`}>{getToastIcon(type)}</span>
      <p className="text-sm font-medium leading-snug flex-1 select-none">{message}</p>

      <motion.div
        className={`absolute bottom-0 left-0 h-[3px] ${border}`}
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.05, ease: "linear" }}
      />
    </motion.div>
  );
}

// -------------------- COLORS + ICONS --------------------
function getToastColors(type, theme) {
  const isDark = theme === "dark";
  switch (type) {
    case "success":
      return {
        bg: isDark ? "bg-green-900/40 text-white" : "bg-green-50 text-green-900",
        border: "border-green-500",
        iconColor: "text-green-500",
        glow: "shadow-[0_0_10px_rgba(34,197,94,0.4)]",
      };
    case "error":
      return {
        bg: isDark ? "bg-red-900/40 text-white" : "bg-red-50 text-red-900",
        border: "border-red-600",
        iconColor: "text-red-600",
        glow: "shadow-[0_0_12px_rgba(220,38,38,0.6)]",
      };
    case "warning":
      return {
        bg: isDark ? "bg-yellow-900/40 text-white" : "bg-yellow-50 text-yellow-900",
        border: "border-yellow-500",
        iconColor: "text-yellow-500",
        glow: "shadow-[0_0_10px_rgba(234,179,8,0.5)]",
      };
    case "info":
    default:
      return {
        bg: isDark ? "bg-blue-900/40 text-white" : "bg-blue-50 text-blue-900",
        border: "border-blue-500",
        iconColor: "text-blue-500",
        glow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]",
      };
  }
}

function getToastIcon(type) {
  switch (type) {
    case "success":
      return <CheckCircle className="w-5 h-5" />;
    case "error":
      return <XCircle className="w-5 h-5" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5" />;
    case "info":
    default:
      return <Info className="w-5 h-5" />;
  }
}
