import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { motion, AnimatePresence } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
    critical: { color: "#E54D4D", label: "Critical" },
    warning: { color: "#E5DB4C", label: "Warning" },
    high: { color: "#FF8C42", label: "High" },
    stable: { color: "#4DE573", label: "Stable" },
    info: { color: "#4D8AE5", label: "Info" },
    low: { color: "#2CD155", label: "Low" },
    note: { color: "#6C8EEF", label: "Note" },
};

function getSeverity(type) {
    const s = (type || "info").toLowerCase();
    return SEVERITY_CONFIG[s] || SEVERITY_CONFIG.info;
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

function toUtcDate(ts) {
    if (!ts) return new Date();
    const s = String(ts);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
        return new Date(s + 'Z');
    }
    return new Date(s);
}

function groupByDate(notifications) {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach((n) => {
        const d = toUtcDate(n.created_at || n.createdAt || n.timestamp);
        const dLocal = new Date(d);
        dLocal.setHours(0, 0, 0, 0);
        let label;
        if (dLocal.getTime() === today.getTime()) label = 'Today';
        else if (dLocal.getTime() === yesterday.getTime()) label = 'Yesterday';
        else label = dLocal.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

function formatTime(ts) {
    if (!ts) return '';
    return toUtcDate(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Notification Row ──────────────────────────────────────────────────────────

// Cinematic Framer Motion Variants for a pronounced 1-by-1 cascade
const rowVariants = {
    hidden: {
        opacity: 0,
        x: -50, // Slide in from left
    },
    visible: (customIndex) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: customIndex * 0.12, // 120ms stagger makes the cascade highly visible
            type: "spring",
            stiffness: 80,
            damping: 14,
            mass: 1
        }
    }),
    exit: {
        opacity: 0,
        x: -50,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 1, 0.5, 1]
        }
    }
};

function NotificationRow({ notif, onAcknowledge, index }) {
    const type = (notif.severity || notif.type || notif.priority || 'info').toLowerCase();
    const sev = getSeverity(type);

    const title = notif.vital_type
        ? `${notif.patient_name || 'Patient'}: ${notif.vital_type} (${notif.triggered_value})`
        : (notif.title || notif.message || 'Notification');

    const desc = notif.vital_type ? notif.message : '';

    const wardId = notif.ward_id || notif.wardId || '—';
    const bedId = notif.room_id || notif.bedId || '—';
    const time = formatTime(notif.created_at || notif.createdAt || notif.timestamp);
    const timeSince = timeAgo(notif.created_at || notif.createdAt || notif.timestamp);
    const status = notif.status || 'active';
    const resolved = notif.is_resolved || status === 'resolved';
    const snoozed = status === 'snoozed';
    const alertId = notif.id || notif._id || notif.alertId;

    return (
        <motion.div
            layout="position"
            custom={index}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 md:grid-cols-[minmax(300px,2fr)_minmax(180px,1fr)_140px_180px] gap-6 items-center px-6 py-5 bg-[#1a1a1c] border-b border-white/5 hover:bg-white/[0.04] transition-colors last:border-b-0 overflow-hidden"
        >
            {/* Notification Info */}
            <div className="flex flex-col gap-1.5">
                <span className="text-base font-medium text-white">{title}</span>
                {desc && <span className="text-sm text-white/50">{desc}</span>}
                <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                    <span>Ward: <span className="text-white/70">{wardId}</span></span>
                    <span>|</span>
                    <span>Room: <span className="text-white/70">{bedId}</span></span>
                </div>
            </div>

            {/* Time */}
            <div className="flex flex-col gap-1 text-sm text-white/70">
                <span className="font-bold text-white">{timeSince}</span>
                <span className="text-xs text-white/40">{time}</span>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={sev.color} strokeWidth="2">
                    <circle cx="12" cy="12" r="5" fill={sev.color} fillOpacity="0.2" />
                    <path d="M12 2v2m0 16v2m8-10h2m-20 0h2m15.07-7.07l-1.41 1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14l-1.41-1.41" />
                </svg>
                <span className="text-sm font-bold tracking-wide" style={{ color: sev.color }}>{sev.label.toUpperCase()}</span>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
                {resolved ? (
                    <span className="inline-flex items-center gap-2 text-[#4DE573] text-sm font-medium">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Resolved {notif.resolved_at ? formatTime(notif.resolved_at) : ''}
                    </span>
                ) : snoozed ? (
                    <span className="inline-flex items-center gap-2 text-[#E5DB4C] text-sm font-medium">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        Snoozed
                    </span>
                ) : (
                    <div className="flex items-center justify-between text-sm text-white/50 w-full pr-2">
                        <span className="text-[#E54D4D] font-medium flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            Active
                        </span>
                        <button onClick={() => onAcknowledge(alertId)} className="text-primary hover:text-primary/80 font-bold tracking-wide transition-colors uppercase text-xs bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md">ACK</button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex gap-6 px-6 py-6 border-b border-white/5 last:border-b-0 bg-[#1a1a1c]"
        >
            <div className="flex-1 rounded-2xl p-5 bg-white/5 animate-pulse border border-white/5 space-y-3">
                <div className="flex gap-3">
                    <div className="h-6 w-40 rounded-full bg-white/10" />
                    <div className="h-6 w-32 rounded-full bg-white/10" />
                </div>
                <div className="h-5 w-1/3 rounded bg-white/8" />
            </div>
        </motion.div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 50;

export default function NotificationsPage() {
    const navigate = useNavigate();

    // ── filter state ──────────────────────────────────────────────────────────
    const [alertCategory, setAlertCategory] = useState('');
    const [isResolved, setIsResolved] = useState(false);

    // ── pagination state ──────────────────────────────────────────────────────
    const [allNotifs, setAllNotifs] = useState([]);
    const [grouped, setGrouped] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // ── async state ───────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const sentinelRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ── fetch ─────────────────────────────────────────────────────────────────
    const fetchPage = useCallback(async (pageNum, reset = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        if (reset) setLoading(true);
        else setLoadingMore(true);

        const res = await patientService.getNotifications(
            false, pageNum, PAGE_LIMIT, alertCategory, isResolved
        );

        if (res.success) {
            const fresh = res.data || [];
            if (reset) {
                setAllNotifs(fresh);
                setGrouped(groupByDate(fresh));
                setTotalCount(res.count || fresh.length);
            } else {
                const merged = [...allNotifs, ...fresh];
                setAllNotifs(merged);
                setGrouped(groupByDate(merged));
            }
            setHasMore(fresh.length >= PAGE_LIMIT);
        }

        if (reset) setLoading(false);
        else setLoadingMore(false);
        isFetchingRef.current = false;
    }, [alertCategory, isResolved]);

    useEffect(() => {
        setPage(1);
        setAllNotifs([]);
        setGrouped([]);
        setHasMore(true);
        fetchPage(1, true);
    }, [alertCategory, isResolved, fetchPage]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
                const next = page + 1;
                setPage(next);
                fetchPage(next, false);
            }
        }, { threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [hasMore, loadingMore, loading, page, fetchPage]);

    const handleAcknowledge = async (alertId) => {
        if (!alertId) return;
        try {
            const res = await patientService.acknowledgeAlert(alertId);
            if (res.success) {
                const updated = allNotifs.filter((n) => (n._id || n.id || n.alertId) !== alertId);
                setAllNotifs(updated);
                setTotalCount(updated.length);
                setGrouped(groupByDate(updated));
            }
        } catch (err) {
            console.error('Acknowledge error:', err);
        }
    };

    const activeFilterCount = [alertCategory !== '', isResolved !== false].filter(Boolean).length;

    const clearFilters = () => {
        setAlertCategory('');
        setIsResolved(false);
    };

    return (
        <div className="p-4 md:p-8 w-full">
            <div className="bg-[#222225] rounded-3xl border border-solid border-white/10 overflow-hidden flex flex-col h-[calc(100vh-120px)]">

                {/* ── Header ── */}
                <div className="shrink-0 border-b border-white/8">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 px-8 py-8">
                        <div className="flex items-center gap-8 flex-wrap">
                            <div className="flex items-center gap-5">
                                <button onClick={() => navigate(-1)} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                                </button>
                                <div>
                                    <h4 className="text-2xl lg:text-3xl font-medium text-white">Notifications</h4>
                                    <p className="text-base text-white/40 mt-1">
                                        {loading ? 'Loading…' : `${totalCount} total notification${totalCount !== 1 ? 's' : ''}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 bg-primary/10 border border-primary/20 rounded-xl p-1.5">
                                {[{ value: "", label: "All" }, { value: "vital", label: "Vital Alerts" }, { value: "device", label: "Device Alerts" }].map(c => (
                                    <button key={c.value} onClick={() => setAlertCategory(c.value)} className={`text-base font-medium px-6 py-2.5 rounded-lg transition-all border ${alertCategory === c.value ? "bg-primary/20 text-primary border-primary/40" : "border-transparent text-primary/70 hover:text-primary"}`}>{c.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-8 flex items-center gap-4 flex-wrap">
                            <div className="flex gap-1 bg-[#1a1a1c] border border-white/5 rounded-lg p-1">
                                {[{ value: false, label: "Active" }, { value: true, label: "Resolved" }].map(s => (
                                    <button key={String(s.value)} onClick={() => setIsResolved(s.value)} className={`text-sm font-medium px-4 py-1.5 rounded-md transition-all ${isResolved === s.value ? s.value === true ? "bg-white/8 text-[#4DE573] border border-white/10" : "bg-white/8 text-[#E54D4D] border border-white/10" : "text-white/35 hover:text-white/60 border border-transparent"}`}>{s.label}</button>
                                ))}
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="text-sm text-white/40 hover:text-white flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-white/5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">

                    {/* initial loading */}
                    {loading && (
                        <div className="bg-[#151517] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                            {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                        </div>
                    )}

                    {/* empty */}
                    {!loading && grouped.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            className="px-6 py-20 text-center flex flex-col items-center justify-center h-full"
                        >
                            <svg className="w-20 h-20 text-white/15 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-para text-lg">No notifications match the current filters</p>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="mt-4 text-base text-white/40 hover:text-white underline underline-offset-2 transition-colors">
                                    Clear all filters
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* notifications table */}
                    {!loading && grouped.length > 0 && (
                        <div className="w-full bg-[#151517] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                            <div className="hidden md:grid grid-cols-[minmax(300px,2fr)_minmax(180px,1fr)_140px_180px] gap-6 px-6 py-4 bg-[#1a1a1c] border-b border-white/10">
                                <div className="flex items-center gap-3 text-xs font-bold text-white/50 uppercase tracking-wider">
                                    <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> Notification
                                </div>
                                <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center">Time</div>
                                <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center">Priority</div>
                                <div className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center">Status</div>
                            </div>

                            <div className="flex flex-col">
                                {(() => {
                                    // Global counter to ensure the delay keeps increasing
                                    // across all dates for a perfect top-to-bottom waterfall
                                    let globalRowIndex = 0;

                                    return grouped.map((group, groupIndex) => (
                                        <div key={groupIndex} className="flex flex-col">
                                            <div className="flex items-center gap-3 px-6 py-3 bg-primary/10 border-y border-primary/20 first:border-t-0">
                                                <span className="text-sm font-bold text-primary uppercase tracking-wider">{group.date}</span>
                                            </div>

                                            <div className="flex flex-col">
                                                <AnimatePresence mode="popLayout">
                                                    {group.items.map((notif) => {
                                                        const currentDelayIndex = globalRowIndex++;
                                                        return (
                                                            <NotificationRow
                                                                key={notif.id || notif._id || notif.alertId}
                                                                notif={notif}
                                                                index={currentDelayIndex}
                                                                onAcknowledge={handleAcknowledge}
                                                            />
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {loadingMore && (
                        <div className="py-8 flex justify-center">
                            <div className="w-10 h-10 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    )}
                    <div ref={sentinelRef} className="h-6" />

                    {!hasMore && !loadingMore && grouped.length > 0 && (
                        <div className="flex items-center gap-4 mt-6 mb-4">
                            <div className="flex-1 h-px bg-white/8" />
                            <span className="text-sm text-white/25 whitespace-nowrap">End of notifications · {allNotifs.length} shown</span>
                            <div className="flex-1 h-px bg-white/8" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}