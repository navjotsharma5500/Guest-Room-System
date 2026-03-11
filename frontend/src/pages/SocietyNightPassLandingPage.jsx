import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, useGoogleLogin } from "@react-oauth/google";
import { ArrowRight, BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import PublicPageWidgets from "../components/PublicPageWidgets";
import {
  clearSocietyNightPassSession,
  getSocietyNightPassToken,
} from "../utils/societyNightPassAuth";
import { societyNightGoogleLogin } from "../utils/societyNightPassApi";

const LOGO_URL =
  "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744";

export default function SocietyNightPassLandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSocietyNightPassToken()) {
      navigate("/society-night-pass/dashboard", { replace: true });
    }
  }, [navigate]);

  const loginWithGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        await societyNightGoogleLogin({ accessToken: tokenResponse.access_token });
        navigate("/society-night-pass/dashboard", { replace: true });
      } catch (err) {
        clearSocietyNightPassSession();
        setError(err.message || "Google login failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login failed."),
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_48%,_#e2e8f0)] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Thapar Institute Logo" className="h-20 w-auto object-contain" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-600">SOCIETY NIGHT PASS</p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
                Welcome to the Society Night Pass Management System
              </h1>
            </div>
          </div>
        </header>

        <main className="grid gap-8 pt-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
                <ShieldCheck className="h-4 w-4" />
                Public Student Entry
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl">
                  SOCIETY NIGHT PASS
                </h2>
                <p className="text-lg leading-8 text-slate-600">
                  Raise requests for society night permissions and track approvals from the university authorities.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <BadgeCheck className="mb-3 h-6 w-6 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-800">Student verification</p>
                  <p className="mt-1 text-sm text-slate-500">Only registered Thapar students can continue.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Building2 className="mb-3 h-6 w-6 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-800">Society event requests</p>
                  <p className="mt-1 text-sm text-slate-500">Submit event details and track permission status.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <ArrowRight className="mb-3 h-6 w-6 text-amber-600" />
                  <p className="text-sm font-semibold text-slate-800">Simple flow</p>
                  <p className="mt-1 text-sm text-slate-500">Sign in, raise request, and monitor approval.</p>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    loginWithGoogle();
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Get Started"}
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="text-sm text-slate-500">Login is restricted to `@thapar.edu` student emails.</p>
              </div>
            </div>
          </section>

          <aside className="rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">Google Sign-In Ready</p>
            <h3 className="mt-4 text-3xl font-black leading-tight">Student access happens here.</h3>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The system checks your Google account, validates the Thapar domain, and matches your email against the student master data before opening the dashboard.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-sm font-semibold text-slate-200">Fallback sign-in button</p>
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setLoading(true);
                  setError("");
                  try {
                    await societyNightGoogleLogin({ token: credentialResponse.credential });
                    navigate("/society-night-pass/dashboard", { replace: true });
                  } catch (err) {
                    clearSocietyNightPassSession();
                    setError(err.message || "Google login failed.");
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => setError("Google login failed.")}
                text="signin_with"
                shape="pill"
                theme="outline"
              />
            </div>
          </aside>
        </main>
      </div>

      <PublicPageWidgets footerMode="flow" footerClassName="mt-6 pb-4" echoClassName="bottom-24" />
    </div>
  );
}
