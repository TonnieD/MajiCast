"use client";

import { useState, useCallback } from "react";

// NLP page is a client component — metadata must be in a separate segment or a
// parent layout. For simplicity we export a static title via the page's head.

const COLOR_OPTIONS   = ["", "Clear", "Brown", "Green", "Other"];
const CLARITY_OPTIONS = ["", "Clear", "Murky"];
const ODOR_OPTIONS    = ["", "None", "Chemical", "Sewage", "Other"];
const RAIN_OPTIONS    = ["", "No recent rain", "Light rain", "Heavy rain"];
const ACTIVITY_OPTIONS= ["", "Residential", "Industrial", "Agricultural", "None"];
const INFRA_OPTIONS   = ["", "Good condition", "Needs repair", "Unknown"];

type Result = { label: "Safe" | "Unsafe"; confidence: number } | null;

export default function NLPPage() {
  const [userText,     setUserText]     = useState("");
  const [color,        setColor]        = useState("");
  const [clarity,      setClarity]      = useState("");
  const [odor,         setOdor]         = useState("");
  const [rain,         setRain]         = useState("");
  const [activity,     setActivity]     = useState("");
  const [infra,        setInfra]        = useState("");
  const [editedText,   setEditedText]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState<Result>(null);
  const [error,        setError]        = useState<string | null>(null);

  // Build the combined text whenever any field changes
  const buildCombined = useCallback(() => {
    const parts: string[] = [];
    if (color)    parts.push(`The water appears ${color.toLowerCase()} in color.`);
    if (clarity)  parts.push(`It is ${clarity.toLowerCase()} in clarity.`);
    if (odor)     parts.push(`It has a ${odor.toLowerCase()} odor.`);
    if (rain)     parts.push(`There was ${rain.toLowerCase()}.`);
    if (activity) parts.push(`The area nearby is ${activity.toLowerCase()}.`);
    if (infra)    parts.push(`The infrastructure is (in) ${infra.toLowerCase()}.`);
    return (userText.trim() + " " + parts.join(" ")).trim();
  }, [userText, color, clarity, odor, rain, activity, infra]);

  // Sync edited text whenever dropdowns change
  const refreshEdited = () => setEditedText(buildCombined());

  const handleSubmit = async () => {
    const text = editedText.trim() || buildCombined();
    if (!text) { setError("Please describe your concern above."); return; }

    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch("/api/predict/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `API error ${res.status}`);
      }
      const data: Result = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error — is the Gemini API configured correctly?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment">
      <div className="page-header">
        <div className="max-w-3xl mx-auto">
          <p className="text-earth-300 text-sm font-semibold tracking-widest uppercase mb-1">Classify</p>
          <h1>NLP Water Report Classification</h1>
          <p>Classify water safety from textual observations using our trained NLP model.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Description */}
        <div className="panel">
          <label className="field-label" htmlFor="user-text">
            Describe what you observe about the water
          </label>
          <textarea
            id="user-text"
            className="field-input resize-none"
            rows={4}
            value={userText}
            onChange={e => { setUserText(e.target.value); setEditedText(""); }}
            placeholder="e.g. The borehole water has a faint chemical smell and slight brown tinge…"
          />
        </div>

        {/* Dropdowns */}
        <div className="panel space-y-5">
          <p className="text-sm font-semibold text-forest-800 uppercase tracking-wide">
            Additional Context (optional)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Water Color",       value: color,    setter: setColor,    opts: COLOR_OPTIONS },
              { label: "Clarity",           value: clarity,  setter: setClarity,  opts: CLARITY_OPTIONS },
              { label: "Odor",              value: odor,     setter: setOdor,     opts: ODOR_OPTIONS },
              { label: "Recent Rain",       value: rain,     setter: setRain,     opts: RAIN_OPTIONS },
              { label: "Nearby Activity",   value: activity, setter: setActivity, opts: ACTIVITY_OPTIONS },
              { label: "Infrastructure",    value: infra,    setter: setInfra,    opts: INFRA_OPTIONS },
            ].map(({ label, value, setter, opts }) => (
              <div key={label}>
                <label className="field-label">{label}</label>
                <select
                  className="field-input"
                  value={value}
                  onChange={e => { setter(e.target.value); setEditedText(""); }}
                  onBlur={refreshEdited}
                >
                  {opts.map(o => <option key={o} value={o}>{o || "— select —"}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Editable combined input */}
        <div className="panel">
          <label className="field-label" htmlFor="combined-text">
            Final Input to the Model (editable)
          </label>
          <p className="text-xs text-forest-600 mb-2">
            This is the text that will be sent to the classifier. Edit freely before submitting.
          </p>
          <textarea
            id="combined-text"
            className="field-input resize-none"
            rows={5}
            value={editedText || buildCombined()}
            onChange={e => setEditedText(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            id="nlp-submit-btn"
            className="btn-primary px-8"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Classifying…" : "Submit for Classification"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="result-unsafe">
            <p className="font-semibold text-[#7a1f1f]">Error</p>
            <p className="text-sm mt-1 text-[#7a1f1f]">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div id="nlp-result" className={result.label === "Safe" ? "result-safe" : "result-unsafe"}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1"
                   style={{ color: result.label === "Safe" ? "#2d6a4f" : "#7a1f1f" }}>
                  Classification Result
                </p>
                <p className="text-2xl font-display font-bold"
                   style={{ color: result.label === "Safe" ? "#2d6a4f" : "#7a1f1f" }}>
                  Water is predicted to be {result.label.toUpperCase()}
                </p>
                <p className="text-sm mt-1 opacity-80">
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <span className={`badge-base flex-shrink-0 ${result.label === "Safe" ? "badge-safe" : "badge-high"}`}>
                {result.label}
              </span>
            </div>
          </div>
        )}

      </div>
      <footer className="site-footer">2025 MajiCast. Data sourced from WPDx and other public datasets.</footer>
    </div>
  );
}
