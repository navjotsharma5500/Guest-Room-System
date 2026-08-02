import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { MessageSquareText, Send, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MAX_DESCRIPTION_LENGTH = 2000;

function AppreciationCarousel({ reviews }) {
  const trackRef = useRef(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => setHalfWidth(track.scrollWidth / 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [reviews]);

  useAnimationFrame((_time, delta) => {
    if (paused || dragging || !halfWidth) return;
    let next = x.get() - delta * 0.035;
    if (next <= -halfWidth) next += halfWidth;
    x.set(next);
  });

  const normalizePosition = () => {
    if (!halfWidth) return;
    let next = x.get();
    while (next <= -halfWidth) next += halfWidth;
    while (next > 0) next -= halfWidth;
    x.set(next);
  };

  const repeatedReviews = [...reviews, ...reviews];

  return (
    <div
      className="campus-feedback-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        ref={trackRef}
        className="campus-feedback-track"
        style={{ x }}
        drag="x"
        dragMomentum={false}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => {
          setDragging(false);
          normalizePosition();
        }}
      >
        {repeatedReviews.map((review, index) => (
          <article className="campus-review-card" key={`${index}-${review.rating}-${review.description.slice(0, 18)}`}>
            <div className="campus-review-stars" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={17} fill={star <= review.rating ? "#f59e0b" : "transparent"} color={star <= review.rating ? "#f59e0b" : "#cbd5e1"} />
              ))}
            </div>
            <p>{review.description}</p>
          </article>
        ))}
      </motion.div>
    </div>
  );
}

export default function CampusFeedbackSection() {
  const { currentUser, googleLogin } = useAuth();
  const submissionLockRef = useRef(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [authError, setAuthError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let active = true;
    fetch("/api/campus-feedback/public", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.message || "Unable to load feedback.");
        if (active) setReviews(Array.isArray(data.feedback) ? data.feedback : []);
      })
      .catch(() => {
        if (active) setReviews([]);
      });
    return () => { active = false; };
  }, []);

  const validate = () => {
    const nextErrors = {};
    const trimmedDescription = description.trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) nextErrors.rating = "Please choose a rating from 1 to 5 stars.";
    if (!trimmedDescription) nextErrors.description = "Feedback description is required.";
    else if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) nextErrors.description = `Please keep your feedback within ${MAX_DESCRIPTION_LENGTH} characters.`;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length ? null : { rating, description: trimmedDescription };
  };

  const submitToBackend = async (payload) => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setSubmitting(true);
    setAuthError("");
    setResultMessage("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/campus-feedback", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.message || "Unable to submit feedback.");
      setRating(0);
      setDescription("");
      setErrors({});
      setPendingFeedback(null);
      setResultMessage("Thank you for your feedback. It will appear publicly after approval.");
    } catch (error) {
      setAuthError(error.message || "Unable to submit feedback right now.");
    } finally {
      submissionLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const payload = validate();
    if (!payload) return;
    if (!currentUser) {
      setPendingFeedback(payload);
      setAuthError("");
      return;
    }
    await submitToBackend(payload);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!pendingFeedback || submitting) return;
    setSubmitting(true);
    setAuthError("");
    const result = await googleLogin(credentialResponse.credential);
    setSubmitting(false);
    if (!result?.success) {
      setAuthError(result?.message || "Google authentication failed. Please try again.");
      return;
    }
    await submitToBackend(pendingFeedback);
  };

  return (
    <section className="campus-feedback-section" aria-labelledby="campus-feedback-title">
      <style>{`
        .campus-feedback-section{position:relative;overflow:hidden;padding:100px 24px;background:radial-gradient(circle at 12% 8%,rgba(198,40,40,.09),transparent 28%),linear-gradient(155deg,#f8fafc,#eef2f7);border-top:1px solid rgba(148,163,184,.2)}
        .campus-feedback-shell{position:relative;z-index:1;max-width:920px;margin:0 auto}
        .campus-feedback-heading{text-align:center;margin-bottom:42px}
        .campus-feedback-heading h2{font-family:'EB Garamond',Georgia,serif;font-size:clamp(2.2rem,5vw,3.7rem);line-height:1.05;color:#111827}
        .campus-feedback-heading p{max-width:620px;margin:14px auto 0;color:#64748b;font-size:15px;line-height:1.7}
        .campus-feedback-card{padding:clamp(24px,5vw,44px);border:1px solid rgba(255,255,255,.9);border-radius:28px;background:rgba(255,255,255,.9);box-shadow:0 28px 80px rgba(15,23,42,.1);backdrop-filter:blur(18px)}
        .campus-feedback-label{display:block;margin-bottom:11px;color:#1e293b;font-size:13px;font-weight:750}
        .campus-star-row{display:flex;gap:7px;margin-bottom:7px}
        .campus-star-button{display:grid;place-items:center;width:42px;height:42px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;transition:transform .2s,border-color .2s,box-shadow .2s}
        .campus-star-button:hover,.campus-star-button:focus-visible{transform:translateY(-3px) scale(1.05);border-color:#fbbf24;box-shadow:0 9px 22px rgba(245,158,11,.16);outline:none}
        .campus-feedback-textarea{width:100%;min-height:150px;margin-top:3px;padding:16px 17px;resize:vertical;border:1px solid #dbe2ea;border-radius:16px;background:#fff;color:#1e293b;font:inherit;font-size:14px;line-height:1.65;transition:border-color .2s,box-shadow .2s}
        .campus-feedback-textarea:focus{outline:none;border-color:#c62828;box-shadow:0 0 0 4px rgba(198,40,40,.09)}
        .campus-feedback-meta{display:flex;justify-content:space-between;gap:12px;margin-top:7px;color:#94a3b8;font-size:11px}
        .campus-feedback-error{margin-top:7px;color:#b91c1c;font-size:12px}
        .campus-feedback-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:22px;padding:14px 22px;border:0;border-radius:14px;background:linear-gradient(135deg,#c62828,#e53935);color:#fff;font-size:14px;font-weight:750;cursor:pointer;box-shadow:0 14px 30px rgba(198,40,40,.22);transition:transform .25s,box-shadow .25s,opacity .25s}
        .campus-feedback-submit:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 18px 38px rgba(198,40,40,.3)}
        .campus-feedback-submit:disabled{cursor:not-allowed;opacity:.62}
        .campus-feedback-auth{display:grid;justify-items:center;gap:13px;margin-top:18px;padding:20px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;text-align:center}
        .campus-feedback-auth p{color:#475569;font-size:13px;line-height:1.55}
        .campus-feedback-success{margin-top:18px;padding:14px 16px;border:1px solid #bbf7d0;border-radius:14px;background:#f0fdf4;color:#166534;font-size:13px;line-height:1.55}
        .campus-appreciation{margin-top:76px}
        .campus-appreciation h3{text-align:center;font-family:'EB Garamond',Georgia,serif;font-size:clamp(1.9rem,4vw,2.8rem);color:#111827}
        .campus-feedback-carousel{margin-top:32px;overflow:hidden;cursor:grab;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
        .campus-feedback-carousel:active{cursor:grabbing}
        .campus-feedback-track{display:flex;width:max-content;gap:18px;padding:10px 9px 26px;touch-action:pan-y}
        .campus-review-card{width:clamp(270px,31vw,360px);min-height:170px;padding:25px;border:1px solid rgba(255,255,255,.95);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 15px 38px rgba(15,23,42,.08);user-select:none}
        .campus-review-stars{display:flex;gap:3px;margin-bottom:18px}
        .campus-review-card p{color:#475569;font-size:13.5px;line-height:1.75;white-space:pre-wrap}
        @media(max-width:640px){.campus-feedback-section{padding:76px 16px}.campus-feedback-card{border-radius:22px}.campus-review-card{width:78vw}.campus-feedback-carousel{margin-left:-16px;margin-right:-16px}}
      `}</style>

      <div className="campus-feedback-shell">
        <motion.div className="campus-feedback-heading" initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .65 }}>
          <h2 id="campus-feedback-title">Share Your Feedback</h2>
          <p>Help us improve Campus Connect by sharing your experience and suggestions.</p>
        </motion.div>

        <motion.form className="campus-feedback-card" onSubmit={handleSubmit} noValidate initial={{ opacity: 0, y: 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7, delay: .08 }}>
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="campus-feedback-label">Rating</legend>
            <div className="campus-star-row" onMouseLeave={() => setHoveredRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" className="campus-star-button" onMouseEnter={() => setHoveredRating(value)} onFocus={() => setHoveredRating(value)} onBlur={() => setHoveredRating(0)} onClick={() => { setRating(value); setErrors((current) => ({ ...current, rating: "" })); }} aria-label={`Rate ${value} out of 5 stars`} aria-pressed={rating === value}>
                  <Star size={23} fill={value <= (hoveredRating || rating) ? "#f59e0b" : "transparent"} color={value <= (hoveredRating || rating) ? "#f59e0b" : "#cbd5e1"} />
                </button>
              ))}
            </div>
            {errors.rating && <p className="campus-feedback-error">{errors.rating}</p>}
          </fieldset>

          <label className="campus-feedback-label" htmlFor="campus-feedback-description" style={{ marginTop: 24 }}>Feedback Description</label>
          <textarea id="campus-feedback-description" className="campus-feedback-textarea" value={description} maxLength={MAX_DESCRIPTION_LENGTH} onChange={(event) => { setDescription(event.target.value); setErrors((current) => ({ ...current, description: "" })); }} placeholder="Tell us about your Campus Connect experience..." aria-invalid={Boolean(errors.description)} />
          <div className="campus-feedback-meta"><span>{errors.description ? <span className="campus-feedback-error">{errors.description}</span> : "Required"}</span><span>{description.length}/{MAX_DESCRIPTION_LENGTH}</span></div>

          <button type="submit" className="campus-feedback-submit" disabled={submitting}><Send size={17} />{submitting ? "Submitting..." : "Submit Feedback"}</button>

          {pendingFeedback && !currentUser && (
            <div className="campus-feedback-auth">
              <MessageSquareText size={22} color="#c62828" />
              <p>Sign in with your existing Thapar Google account to submit. Your feedback will remain ready.</p>
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setAuthError("Google authentication failed. Please try again.")} theme="outline" shape="pill" text="signin_with" />
            </div>
          )}
          {authError && <p className="campus-feedback-error" role="alert">{authError}</p>}
          {resultMessage && <p className="campus-feedback-success" role="status">{resultMessage}</p>}
        </motion.form>

        {reviews.length > 0 && (
          <motion.div className="campus-appreciation" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
            <h3>Words of Appreciation</h3>
            <AppreciationCarousel reviews={reviews} />
          </motion.div>
        )}
      </div>
    </section>
  );
}
