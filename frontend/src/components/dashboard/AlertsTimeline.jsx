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

// ── Alert table row ────────────────────────────────────────────────────────────

function AlertTableRow({ item }) {
  const sev = getSeverity(item);
  const isAlert = item._kind === "alert";
  const statusActive = item.status?.toLowerCase() === "active" || !item.is_resolved;
  
  const timeStr = statusActive
    ? `${formatTime(item.created_at)} to NOW`
    : `${formatTime(item.created_at)} to ${formatTime(item.resolved_at || item.created_at)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(200px,1.5fr)_minmax(250px,2fr)_120px_120px] gap-4 items-center px-4 py-3 bg-[#1a1a1c] border-b border-white/5 hover:bg-white/[0.04] transition-colors last:border-b-0">
      {/* Alerts */}
      <div className="flex items-center gap-3">
        <div className="bg-white/5 border border-white/10 text-white/80 text-[11px] px-3 py-1.5 rounded min-w-[100px] text-center font-medium">
          {isAlert ? (item.triggered_value ? `Triggered: ${item.triggered_value}` : "Alert") : "Note"}
        </div>
      </div>
      
      {/* Time Duration */}
      <div className="flex items-center gap-2 text-[11px] text-white/70 whitespace-nowrap overflow-hidden text-ellipsis">
        {statusActive ? (
          <span className="bg-[#FFBB33] text-black font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">Active</span>
        ) : (
          <span className="font-bold text-white">{timeAgo(item.created_at)}</span>
        )}
        <span className="text-white/20">|</span>
        <span className="truncate">{timeStr}</span>
      </div>

      {/* Priority */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2">
           <circle cx="12" cy="12" r="5" fill={sev.color} fillOpacity="0.2"/>
           <path d="M12 2v2m0 16v2m8-10h2m-20 0h2m15.07-7.07l-1.41 1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14l-1.41-1.41" />
        </svg>
        <span className="text-[11px] font-bold tracking-wide" style={{ color: sev.color }}>{sev.label.toUpperCase()}</span>
      </div>

      {/* Acknowledged By */}
      <div className="flex items-center justify-between text-[11px] text-white/50 w-full pr-2">
        <span className="truncate max-w-[60px]">{item.is_resolved ? "System" : "-"}</span>
        <button className="text-primary hover:text-primary/80 font-bold tracking-wide transition-colors uppercase text-[10px] bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded">ACK</button>
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
          <div className="flex items-end justify-end gap-3">
            <div className="flex gap-0.5 bg-primary/10 border border-primary/20 rounded-xl p-1">
              {[{ value: "vital", label: "Vital Alerts" }, { value: "device", label: "Device Alerts" }].map(c => (
                <button
                  key={c.value}
                  onClick={() => setAlertCategory(c.value)}
                  className={`text-sm font-medium px-5 py-2 rounded-lg transition-all border ${alertCategory === c.value
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "border-transparent text-primary/70 hover:text-primary"
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Resolution status */}
          <div className="flex gap-0.5 bg-[#1a1a1c] border border-white/5 rounded-lg p-0.5">
            {[{ value: "false", label: "Active" }, { value: "true", label: "Resolved" }].map(s => (
              <button
                key={s.value}
                onClick={() => setIsResolved(s.value)}
                className={`text-[11px] font-medium px-3.5 py-1 rounded-md transition-all ${isResolved === s.value
                  ? s.value === "true"
                    ? "bg-white/8 text-green-400 border border-white/10"
                    : "bg-white/8 text-blue-400 border border-white/10"
                  : "text-white/35 hover:text-white/60 border border-transparent"
                  }`}
              >
                {s.label}
              </button>
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
          <div className="w-full bg-[#151517] border border-white/10 rounded-xl overflow-hidden mt-4 shadow-xl">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[minmax(200px,1.5fr)_minmax(250px,2fr)_120px_120px] gap-4 px-4 py-3 bg-[#1a1a1c] border-b border-white/10">
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Alerts
              </div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center">Time Duration</div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center">Priority</div>
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center">Acknowledged By</div>
            </div>

            {/* Grouped Rows */}
            <div className="flex flex-col">
              {Object.entries(
                items.reduce((acc, item) => {
                  const type = (item._kind === "alert" ? item.vital_type : item.event_type) || "OTHER";
                  const normalized = type.replace(/_/g, " ").toUpperCase();
                  if (!acc[normalized]) acc[normalized] = [];
                  acc[normalized].push(item);
                  return acc;
                }, {})
              ).map(([groupName, groupItems], gIdx) => (
                <div key={groupName} className="flex flex-col">
                  {/* Group Header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-y border-primary/20 first:border-t-0">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      {groupName}
                    </span>
                  </div>
                  
                  {/* Group Items */}
                  <div className="flex flex-col">
                    {groupItems.map((item, idx) => (
                      <AlertTableRow key={item.id ?? `${gIdx}-${idx}`} item={item} />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* load-more skeletons inline */}
              {loadingMore && (
                 <div className="p-4 border-t border-white/10">
                    <SkeletonRow />
                 </div>
              )}
            </div>
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
