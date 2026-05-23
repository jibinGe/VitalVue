import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const typeColorMap = {
    critical: 'bg-[#E54D4D]/15 text-[#E54D4D]',
    warning:  'bg-[#E5DB4D]/15 text-[#E5DB4C]',
    stable:   'bg-[#4DE573]/15 text-[#4DE573]',
    info:     'bg-[#4D8AE5]/15 text-[#4D8AE5]',
};
const iconColorMap = {
    critical: '#E54D4D',
    warning:  '#E5AD00',
    stable:   '#1AB340',
    info:     '#9855F7',
};

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

const DefaultIcon = ({ color = '#9855F7' }) => (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill={color} />
        <path d="M14 24.625H18L20.3333 20.875L24 29L28 19L30.6667 24.625H34" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ── Filter pill ───────────────────────────────────────────────────────────────

function FilterPill({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`text-xs h-8 px-3.5 rounded-xl font-medium transition-all duration-150 whitespace-nowrap ${
                active
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-white/50 hover:text-white hover:bg-white/8'
            }`}
        >
            {children}
        </button>
    );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex gap-4 px-6 py-5 border-t border-white/5 animate-pulse">
            <div className="size-11 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-2/3 rounded bg-white/10" />
                <div className="h-3 w-1/3 rounded bg-white/8" />
                <div className="h-7 w-24 rounded-lg bg-white/5 mt-2" />
            </div>
            <div className="h-6 w-14 rounded-full bg-white/8 shrink-0" />
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 50;

export default function NotificationsPage() {
    const navigate = useNavigate();

    // ── filter state ──────────────────────────────────────────────────────────
    const [unreadOnly, setUnreadOnly]       = useState(false);
    const [alertCategory, setAlertCategory] = useState('');       // '' | 'vital' | 'device'
    const [isResolved, setIsResolved]       = useState(undefined); // undefined | true | false

    // ── pagination state ──────────────────────────────────────────────────────
    const [allNotifs, setAllNotifs]   = useState([]);
    const [grouped, setGrouped]       = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage]             = useState(1);
    const [hasMore, setHasMore]       = useState(true);

    // ── async state ───────────────────────────────────────────────────────────
    const [loading, setLoading]         = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // ── infinite scroll ───────────────────────────────────────────────────────
    const sentinelRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ── fetch ─────────────────────────────────────────────────────────────────
    const fetchPage = useCallback(async (pageNum, reset = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        if (reset) setLoading(true);
        else        setLoadingMore(true);

        const res = await patientService.getNotifications(
            unreadOnly, pageNum, PAGE_LIMIT, alertCategory, isResolved
        );

        if (res.success) {
            const fresh = res.data;
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
        else        setLoadingMore(false);
        isFetchingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadOnly, alertCategory, isResolved]);

    // reset when filters change
    useEffect(() => {
        setPage(1);
        setAllNotifs([]);
        setGrouped([]);
        setHasMore(true);
        fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadOnly, alertCategory, isResolved]);

    // infinite scroll observer
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

    // ── active filter count ───────────────────────────────────────────────────
    const activeFilterCount = [unreadOnly, alertCategory !== '', isResolved !== undefined].filter(Boolean).length;

    const clearFilters = () => {
        setUnreadOnly(false);
        setAlertCategory('');
        setIsResolved(undefined);
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-8 w-full">
            <div className="bg-[#222225] rounded-3xl border border-solid border-white/10 overflow-hidden flex flex-col h-[calc(100vh-120px)]">

                {/* ── Header ── */}
                <div className="shrink-0 border-b border-white/8">
                    {/* top row */}
                    <div className="flex items-center gap-4 justify-between px-6 pt-6 pb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
                                </svg>
                            </button>
                            <div>
                                <h2 className="text-2xl font-semibold text-white">Notifications</h2>
                                <p className="text-para text-sm mt-0.5">
                                    {loading ? 'Loading…' : `${totalCount} total notification${totalCount !== 1 ? 's' : ''}`}
                                    {activeFilterCount > 0 && (
                                        <span className="ml-2 text-primary/80">· {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* clear filters */}
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* filter bar */}
                    <div className="flex flex-wrap items-center gap-3 px-6 pb-4">

                        {/* Unread toggle */}
                        <div className="flex items-center gap-1 bg-[#2e2e31] p-1 rounded-xl">
                            <FilterPill active={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</FilterPill>
                            <FilterPill active={unreadOnly}  onClick={() => setUnreadOnly(true)}>Unread Only</FilterPill>
                        </div>

                        <div className="w-px h-5 bg-white/10" />

                        {/* Category */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/30 hidden sm:block">Category</span>
                            <div className="flex items-center gap-1 bg-[#2e2e31] p-1 rounded-xl">
                                <FilterPill active={alertCategory === ''}       onClick={() => setAlertCategory('')}>All</FilterPill>
                                <FilterPill active={alertCategory === 'vital'}  onClick={() => setAlertCategory('vital')}>Vital</FilterPill>
                                <FilterPill active={alertCategory === 'device'} onClick={() => setAlertCategory('device')}>Device</FilterPill>
                            </div>
                        </div>

                        <div className="w-px h-5 bg-white/10" />

                        {/* Resolution status */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/30 hidden sm:block">Status</span>
                            <div className="flex items-center gap-1 bg-[#2e2e31] p-1 rounded-xl">
                                <FilterPill active={isResolved === undefined} onClick={() => setIsResolved(undefined)}>All</FilterPill>
                                <FilterPill active={isResolved === false}     onClick={() => setIsResolved(false)}>Active</FilterPill>
                                <FilterPill active={isResolved === true}      onClick={() => setIsResolved(true)}>Resolved</FilterPill>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-2">

                    {/* initial loading */}
                    {loading && (
                        <div className="bg-[#2A2A2D] rounded-2xl border border-white/5 overflow-hidden mt-2">
                            {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* empty */}
                    {!loading && grouped.length === 0 && (
                        <div className="px-5 py-16 text-center flex flex-col items-center justify-center h-full">
                            <svg className="w-16 h-16 text-white/15 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-para text-base">No notifications match the current filters</p>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="mt-3 text-sm text-white/40 hover:text-white underline underline-offset-2 transition-colors">
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}

                    {/* notifications list */}
                    {!loading && grouped.length > 0 && (
                        <div className="space-y-4 pb-6">
                            {grouped.map((group, groupIndex) => (
                                <div key={groupIndex} className="bg-[#2A2A2D] rounded-2xl overflow-hidden border border-white/5">
                                    {/* date header */}
                                    <div className="px-6 py-3 bg-white/4 border-b border-white/5">
                                        <span className="font-semibold text-xs text-white/60 tracking-widest uppercase">{group.date}</span>
                                    </div>

                                    <div className="flex flex-col">
                                        {group.items.map((notif, idx) => {
                                            const alertId   = notif.id || notif._id || notif.alertId;
                                            const type      = (notif.severity || notif.type || notif.priority || 'info').toLowerCase();
                                            const badgeClass = typeColorMap[type] || typeColorMap.info;
                                            const iconColor  = iconColorMap[type] || iconColorMap.info;
                                            const title     = notif.vital_type
                                                ? `${notif.patient_name}: ${notif.vital_type} (${notif.triggered_value})`
                                                : (notif.title || notif.message || 'Notification');
                                            const wardId    = notif.ward_id  || notif.wardId  || '—';
                                            const bedId     = notif.room_id  || notif.bedId   || '—';
                                            const time      = formatTime(notif.created_at || notif.createdAt || notif.timestamp);
                                            const status     = notif.status || 'active';
                                            const resolved   = notif.is_resolved || status === 'resolved';
                                            const snoozed    = status === 'snoozed';

                                            return (
                                                <div
                                                    key={alertId || idx}
                                                    className={`flex flex-col ${idx !== 0 ? 'border-t border-white/5' : ''}`}
                                                >
                                                    <div className={`flex flex-col gap-y-4 px-6 py-5 hover:bg-white/4 transition-colors duration-200 ${status === 'active' ? 'border-l-[3px] border-primary' : 'border-l-[3px] border-transparent'}`}>
                                                        <div className="flex items-start gap-4">
                                                            <div className="shrink-0 mt-0.5"><DefaultIcon color={iconColor} /></div>
                                                            <div className="flex-1 flex flex-col gap-y-1.5">
                                                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                                        <span className="text-base font-medium text-white leading-tight">{title}</span>
                                                                        <span className={`flex items-center justify-center px-2.5 py-0.5 text-[11px] font-medium rounded-full capitalize ${badgeClass}`}>{type}</span>
                                                                    </div>
                                                                    <div className="shrink-0 text-para text-xs bg-white/5 px-3 py-1 rounded-full">{time}</div>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-3 text-sm font-normal text-white/60">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                                                        Ward: <span className="text-white">{wardId}</span>
                                                                    </span>
                                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                                    <span className="flex items-center gap-1.5">
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                                                                        Room: <span className="text-white">{bedId}</span>
                                                                    </span>
                                                                </div>

                                                                {/* status chip */}
                                                                <div className="mt-0.5">
                                                                    {resolved ? (
                                                                        <span className="inline-flex items-center gap-2 text-[#4DE573] bg-[#4DE573]/10 px-3 py-1.5 rounded-lg text-sm">
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                                            Action Taken {notif.resolved_at ? `at ${formatTime(notif.resolved_at)}` : ''}
                                                                        </span>
                                                                    ) : snoozed ? (
                                                                        <span className="inline-flex items-center gap-2 text-[#E5DB4C] bg-[#E5DB4C]/10 px-3 py-1.5 rounded-lg text-sm">
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                                            Snoozed {notif.snoozed_until ? `until ${formatTime(notif.snoozed_until)}` : ''}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-2 text-[#E54D4D] bg-[#E54D4D]/10 px-3 py-1.5 rounded-lg text-sm">
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                                            Active Alert
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* load-more spinner */}
                            {loadingMore && (
                                <div className="py-6 flex justify-center">
                                    <div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}

                            {/* sentinel */}
                            <div ref={sentinelRef} className="h-4" />

                            {/* end of list */}
                            {!hasMore && !loadingMore && grouped.length > 0 && (
                                <div className="flex items-center gap-3 py-4 px-2">
                                    <div className="flex-1 h-px bg-white/8" />
                                    <span className="text-[11px] text-white/25 whitespace-nowrap">
                                        End of notifications · {allNotifs.length} shown
                                    </span>
                                    <div className="flex-1 h-px bg-white/8" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
