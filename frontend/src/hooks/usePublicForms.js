import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicForms, PUBLIC_FORMS_CHANGED, PUBLIC_FORMS_STORAGE_KEY } from "../utils/publicFormsApi";

export default function usePublicForms() {
  const [state, setState] = useState({ forms: [], loading: true, error: "" });
  const mounted = useRef(false);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const requestId = ++sequence.current;
    try {
      const forms = await getPublicForms();
      if (mounted.current && requestId === sequence.current) setState({ forms, loading: false, error: "" });
    } catch (error) {
      if (mounted.current && requestId === sequence.current) setState({ forms: [], loading: false, error: error.message });
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    reload();
    const refreshVisible = () => { if (document.visibilityState !== "hidden") reload(); };
    const onStorage = (event) => { if (event.key === PUBLIC_FORMS_STORAGE_KEY) reload(); };
    window.addEventListener(PUBLIC_FORMS_CHANGED, reload);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", refreshVisible);
    const interval = setInterval(refreshVisible, 30000);
    return () => {
      mounted.current = false;
      sequence.current += 1;
      clearInterval(interval);
      window.removeEventListener(PUBLIC_FORMS_CHANGED, reload);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [reload]);
  return { ...state, reload };
}
