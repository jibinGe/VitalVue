import React, { useEffect, useState, useCallback, useRef } from "react";
import { patientService } from "@/services/patientService";

// ── Severity / status helpers ────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { color: "#E54D4D", bg: "rgba(229,77,77,0.12)", border: "rgba(229,77,77,0.35)", label: "Critical" },
  high: { color: "#FF8C42", bg: "rgba(255,140,66,0.12)", border: "rgba(255,140,66,0.35)", label: "High" },
  medium: { color: "#FFBB33", bg: "rgba(255,187,51,0.12)", border: "rgba(255,187,51,0.30)", label: "Medium" },
  low: { color: "#2CD155", bg: "rgba(44,209,85,0.10)", border: "rgba(44,209,85,0.30)", label: "Low" },
  note: { color: "#6C8EEF", bg: "rgba(108,142,239,0.10)", border: "rgba(108,142,239,0.30)", label: "Note" },
};

function getSeverity(item) {
  const s = (item.severity || "").toLowerCase();
  return SEVERITY_CONFIG[s] || SEVERITY_CONFIG.low;
}

function formatTime(iso) {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function timeAgo(iso) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ""; }
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, resolved }) {
  if (resolved) {
    return (
      <span style={{ background: "rgba(44,209,85,0.12)", color: "#2CD155", border: "1px solid rgba(44,209,85,0.30)" }}
        className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
        Resolved
      </span>
    );
  }
  const MAP = {
    active: { bg: "rgba(229,77,77,0.12)", color: "#E54D4D", border: "rgba(229,77,77,0.30)" },
    snoozed: { bg: "rgba(255,187,51,0.12)", color: "#FFBB33", border: "rgba(255,187,51,0.30)" },
    pending: { bg: "rgba(108,142,239,0.10)", color: "#6C8EEF", border: "rgba(108,142,239,0.30)" },
  };
  const c = MAP[(status || "active").toLowerCase()] || MAP.active;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
      className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
      {status || "Active"}
    </span>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ alert }) {
  const sev = getSeverity(alert);
  const vitalLabel = (alert.vital_type || "").replace(/_/g, " ");

  return (
    <div className="relative flex gap-4 group" style={{ paddingLeft: "28px" }}>
      <span
        className="absolute top-[18px] size-3 rounded-full border-2 border-[#1a1a1c] z-10 transition-transform duration-200 group-hover:scale-125"
        style={{ background: sev.color, left: "14px" }}
      />
      <div
        className="flex-1 rounded-2xl p-4 border transition-all duration-200 group-hover:-translate-y-px"
        style={{ background: sev.bg, borderColor: sev.border }}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: sev.color + "22", color: sev.color, border: `1px solid ${sev.border}` }}
            >
              {sev.label}
            </span>
            {vitalLabel && (
              <span className="text-sm font-medium text-white capitalize">{vitalLabel}</span>
            )}
            {alert.is_flagged && (
              <span title="Flagged" className="text-[11px] text-yellow-400 font-medium flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v16h2v-7h14l-4-4 4-4H6V5H4z" /></svg>
                Flagged
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={alert.status} resolved={alert.is_resolved} />
            <span className="text-[11px] text-white/40">{timeAgo(alert.created_at)}</span>
          </div>
        </div>

        {alert.triggered_value && (
          <p className="text-sm text-white/80 mb-1">
            <span className="text-white/50">Triggered: </span>
            <span className="font-medium text-white">{alert.triggered_value}</span>
          </p>
        )}

        {alert.actions_taken?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {alert.actions_taken.map((a, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                {typeof a === "object" ? a.action_type || JSON.stringify(a) : a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-white/35 flex-wrap">
          <span>{formatTime(alert.created_at)}</span>
          {alert.is_resolved && alert.resolved_at && <span>· Resolved {formatTime(alert.resolved_at)}</span>}
          {alert.snoozed_until && !alert.is_resolved && <span>· Snoozed until {formatTime(alert.snoozed_until)}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Clinical note card ────────────────────────────────────────────────────────

function NoteCard({ note }) {
  const cfg = SEVERITY_CONFIG.note;
  return (
    <div className="relative flex gap-4 group" style={{ paddingLeft: "28px" }}>
      <span
        className="absolute top-[18px] size-3 rounded-full border-2 border-[#1a1a1c] z-10 transition-transform duration-200 group-hover:scale-125"
        style={{ background: cfg.color, left: "14px" }}
      />
      <div
        className="flex-1 rounded-2xl p-4 border transition-all duration-200 group-hover:-translate-y-px"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.border}` }}
            >
              Clinical Note
            </span>
            {note.event_type && (
              <span className="text-sm font-medium text-white capitalize">{note.event_type}</span>
            )}
            {note.is_flagged_for_review && (
              <span className="text-[11px] text-yellow-400 font-medium flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5v16h2v-7h14l-4-4 4-4H6V5H4z" /></svg>
                Review
              </span>
            )}
          </div>
          <span className="text-[11px] text-white/40">{timeAgo(note.created_at)}</span>
        </div>

        {note.note_content && (
          <p className="text-sm text-white/80 leading-relaxed">{note.note_content}</p>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-white/35 flex-wrap">
          <span>{formatTime(note.event_timestamp || note.created_at)}</span>
          {note.author_id && <span>· Author {note.author_id}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Filter pill button ────────────────────────────────────────────────────────

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-lg h-14 px-17 rounded-lg font-medium transition-all duration-150 whitespace-nowrap ${active
        ? "btn btn-gradient text-white shadow-sm"
        : "text-white/50 hover:text-white hover:bg-white/5"
        }`}
    >
      {children}
    </button>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="relative flex gap-4" style={{ paddingLeft: "28px" }}>
      <span className="absolute top-[18px] size-3 rounded-full bg-white/10 animate-pulse" style={{ left: "14px" }} />
      <div className="flex-1 rounded-2xl p-4 bg-white/5 animate-pulse border border-white/5 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-white/10" />
          <div className="h-5 w-24 rounded-full bg-white/10" />
        </div>
        <div className="h-4 w-2/3 rounded bg-white/8" />
        <div className="h-3 w-1/3 rounded bg-white/5" />
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── Main component ────────────────────────────────────────────────────────────

export default function AlertsTimeline({ patientId }) {
  // ── filter state (sent to API) ────────────────────────────────────────────
  const [typeTab, setTypeTab] = useState("alerts");          // "alerts" only
  const [alertCategory, setAlertCategory] = useState("vital");         // "vital" | "device"
  const [isResolved, setIsResolved] = useState("false");             // "true" | "false"

  // ── pagination + data state ──────────────────────────────────────────────
  const [items, setItems] = useState([]);             // accumulated items
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);

  // ── async state ───────────────────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // ── infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false); // guard against double-fire

  // ── fetch a single page ───────────────────────────────────────────────────
  const fetchPage = useCallback(async (pageNum, reset = false) => {
    if (!patientId || isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (reset) {
      setInitialLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    // Build query params
    const params = { page: pageNum, limit: PAGE_SIZE };
    if (alertCategory) params.alert_category = alertCategory;
    if (isResolved !== "") params.is_resolved = isResolved === "true";

    const res = await patientService.getPatientTimeline(patientId, params);

    if (res.success) {
      const d = res.data;

      // Merge alerts + notes into a unified list sorted newest-first
      const rawAlerts = (d.alerts || []).map(a => ({ ...a, _kind: "alert", _ts: a.created_at }));
      const rawNotes = (d.clinical_notes || []).map(n => ({ ...n, _kind: "note", _ts: n.event_timestamp || n.created_at }));

      let merged = [];
      if (typeTab === "all") merged = [...rawAlerts, ...rawNotes];
      else if (typeTab === "alerts") merged = rawAlerts;
      else merged = rawNotes;

      merged.sort((a, b) => new Date(b._ts) - new Date(a._ts));

      setTotalAlerts(d.total_alerts_count ?? rawAlerts.length);
      setTotalNotes(d.total_notes_count ?? rawNotes.length);

      setItems(prev => reset ? merged : [...prev, ...merged]);

      // No more pages if we got fewer items than requested
      setHasMore(merged.length >= PAGE_SIZE);
    } else {
      setError(res.message);
    }

    if (reset) setInitialLoading(false);
    else setLoadingMore(false);
    isFetchingRef.current = false;
  }, [patientId, alertCategory, isResolved, typeTab]);

  // ── reset & re-fetch when filters change ─────────────────────────────────
  useEffect(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, alertCategory, isResolved, typeTab]);

  // ── IntersectionObserver for infinite scroll ──────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !initialLoading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, initialLoading, page, fetchPage]);

  // ── manual refresh ────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    fetchPage(1, true);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-10">

      {/* ── Header & Filters ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <h4 className="text-xl lg:text-2xl font-medium text-white">Alerts Timeline</h4>
            {!initialLoading && (
              <p className="text-sm text-white/40 mt-0.5">
                {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Alert category */}
          <div className="flex items-center gap-1 bg-[#252527] p-1 rounded-xl border border-white/5">
            {[
              { value: "vital", label: "Vital Alerts" },
              { value: "device", label: "Device Alerts" },
            ].map(c => (
              <FilterPill
                key={c.value}
                active={alertCategory === c.value}
                onClick={() => setAlertCategory(c.value)}
              >
                {c.label}
              </FilterPill>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Resolution status */}
          <div className="flex items-center gap-1 bg-[#252527] p-1 rounded-xl border border-white/5">
            {[
              { value: "false", label: "Active" },
              { value: "true", label: "Resolved" },
            ].map(s => (
              <FilterPill
                key={s.value}
                active={isResolved === s.value}
                onClick={() => setIsResolved(s.value)}
              >
                {s.label}
              </FilterPill>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={initialLoading}
            title="Refresh"
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-[#252527] border border-white/5 text-white/50 hover:text-white hover:bg-[#3a3a3e] transition-all disabled:opacity-40 flex-shrink-0"
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className={initialLoading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M8 16H3v5M16 3h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Initial loading skeletons ── */}
      {initialLoading && (
        <div
          className="relative space-y-4"
          style={{ paddingLeft: "14px", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
        >
          {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* ── Error state ── */}
      {!initialLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E54D4D" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-white/60 text-sm mb-3">{error}</p>
          <button onClick={handleRefresh} className="btn btn-gradient rounded-xl px-6 text-sm">Retry</button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!initialLoading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">No events match the current filters</p>
          <button
            onClick={() => { setAlertCategory("vital"); setIsResolved("false"); }}
            className="mt-3 text-xs text-white/40 hover:text-white underline underline-offset-2 transition-colors"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ── Timeline feed ── */}
      {!initialLoading && !error && items.length > 0 && (
        <>
          <div
            className="relative space-y-4"
            style={{ paddingLeft: "14px", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
          >
            {items.map((item, idx) =>
              item._kind === "alert"
                ? <AlertCard key={`alert-${item.id ?? idx}`} alert={item} />
                : <NoteCard key={`note-${item.id ?? idx}`} note={item} />
            )}

            {/* load-more skeletons inline */}
            {loadingMore && [1, 2].map(i => <SkeletonRow key={`more-${i}`} />)}
          </div>

          {/* Sentinel — observed by IntersectionObserver */}
          <div ref={sentinelRef} className="h-8" />

          {/* End-of-list message */}
          {!hasMore && !loadingMore && (
            <div className="flex items-center gap-3 mt-4 px-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-[11px] text-white/25 whitespace-nowrap">End of timeline · {items.length} event{items.length !== 1 ? "s" : ""}</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
