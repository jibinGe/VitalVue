import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';

const DefaultIcon = ({ color = '#9855F7' }) => (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill={color} />
        <path d="M14 24.625H18L20.3333 20.875L24 29L28 19L30.6667 24.625H34" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

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

// ── Timestamp helpers ─────────────────────────────────────────────────────────

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

// ── Compact filter pill ───────────────────────────────────────────────────────

function Pill({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`text-[11px] h-6 px-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                active
                    ? 'bg-primary text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/8'
            }`}
        >
            {children}
        </button>
    );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function Notifactions() {
    const [allNotifs, setAllNotifs]         = useState([]);
    const [grouped, setGrouped]             = useState([]);
    const [totalCount, setTotalCount]       = useState(0);

    // filters
    const [unreadOnly, setUnreadOnly]       = useState(false);
    const [alertCategory, setAlertCategory] = useState('');       // '' | 'vital' | 'device'
    const [isResolved, setIsResolved]       = useState(undefined); // undefined | true | false

    const [loading, setLoading]   = useState(true);
    const [ackingId, setAckingId] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await patientService.getNotifications(
                unreadOnly, 1, 20, alertCategory, isResolved
            );
            if (res.success) {
                setAllNotifs(res.data);
                setTotalCount(res.count || res.data.length);
                setGrouped(groupByDate(res.data));
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [unreadOnly, alertCategory, isResolved]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleAcknowledge = async (alertId) => {
        if (!alertId || ackingId === alertId) return;
        setAckingId(alertId);
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
        } finally {
            setAckingId(null);
        }
    };

    const line_shape = (
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.18)_50%,rgba(255,255,255,0)_100%)]" />
    );

    const activeFilters = [unreadOnly, alertCategory !== '', isResolved !== undefined].filter(Boolean).length;

    return (
        <>
            {/* ── Header ── */}
            <div className="flex items-center gap-2 justify-between px-5 py-3.5">
                <h6 className="text-base font-medium">
                    Notifications {totalCount > 0 && <span className="text-white/40 font-normal">({totalCount})</span>}
                </h6>
                {activeFilters > 0 && (
                    <button
                        onClick={() => { setUnreadOnly(false); setAlertCategory(''); setIsResolved(undefined); }}
                        className="text-[10px] text-white/35 hover:text-white flex items-center gap-1 transition-colors"
                    >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Clear
                    </button>
                )}
            </div>

            {/* ── Filter bar ── */}
            <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                {/* Read status */}
                <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg">
                    <Pill active={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</Pill>
                    <Pill active={unreadOnly}  onClick={() => setUnreadOnly(true)}>Unread</Pill>
                </div>

                {/* Category */}
                <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg">
                    <Pill active={alertCategory === ''}       onClick={() => setAlertCategory('')}>Any</Pill>
                    <Pill active={alertCategory === 'vital'}  onClick={() => setAlertCategory('vital')}>Vital</Pill>
                    <Pill active={alertCategory === 'device'} onClick={() => setAlertCategory('device')}>Device</Pill>
                </div>

                {/* Resolution */}
                <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg">
                    <Pill active={isResolved === undefined} onClick={() => setIsResolved(undefined)}>All</Pill>
                    <Pill active={isResolved === false}     onClick={() => setIsResolved(false)}>Active</Pill>
                    <Pill active={isResolved === true}      onClick={() => setIsResolved(true)}>Resolved</Pill>
                </div>
            </div>

            {line_shape}

            {/* ── List ── */}
            <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="px-5 py-8 text-center text-para text-sm">Loading notifications…</div>
                ) : grouped.length === 0 ? (
                    <div className="px-5 py-8 text-center text-para text-sm">No notifications match the current filters.</div>
                ) : (
                    grouped.map((group, index) => (
                        <React.Fragment key={index}>
                            <div className="px-5 py-2.5">
                                <span className="font-medium font-inter uppercase text-[10px] text-white/40 tracking-wider">{group.date}</span>
                            </div>
                            <div className="flex flex-col">
                                {group.items.map((notif, idx) => {
                                    const alertId = notif.id || notif._id || notif.alertId;
                                    const type = (notif.severity || notif.type || notif.priority || 'info').toLowerCase();
                                    const badgeClass = typeColorMap[type] || typeColorMap.info;
                                    const iconColor  = iconColorMap[type] || iconColorMap.info;
                                    const title = notif.vital_type
                                        ? `${notif.patient_name}: ${notif.vital_type} (${notif.triggered_value})`
                                        : (notif.title || notif.message || 'Notification');
                                    const wardId = notif.ward_id || notif.wardId || '—';
                                    const bedId  = notif.room_id || notif.bedId  || '—';
                                    const time   = formatTime(notif.created_at || notif.createdAt || notif.timestamp);
                                    const status     = notif.status || 'active';
                                    const resolved   = notif.is_resolved || status === 'resolved';
                                    const snoozed    = status === 'snoozed';

                                    return (
                                        <div className="flex flex-col" key={alertId || idx}>
                                            {line_shape}
                                            <div className={`flex flex-col gap-y-3.5 px-4 py-4 hover:bg-white/5 transition-colors duration-200 ${status === 'active' ? 'border-l-2 border-primary' : ''}`}>
                                                <div className="flex items-center gap-3.5 md:gap-4">
                                                    <div><DefaultIcon color={iconColor} /></div>
                                                    <div className="flex-1 flex flex-col gap-y-1">
                                                        <h6 className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-medium text-white">{title}</span>
                                                            <span className={`min-h-5 flex items-center justify-center px-2 text-[10px] font-normal rounded-full capitalize ${badgeClass}`}>
                                                                {type}
                                                            </span>
                                                        </h6>
                                                        <div className="flex items-center gap-2 text-xs flex-wrap text-white/50">
                                                            <span>Ward: <span className="text-white/70">{wardId}</span></span>
                                                            <span>·</span>
                                                            <span>Room: <span className="text-white/70">{bedId}</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto text-para text-xs mb-auto shrink-0">{time}</div>
                                                </div>

                                                {/* status indicator */}
                                                <div className="text-xs">
                                                    {resolved ? (
                                                        <span className="text-[#4DE573] flex items-center gap-1.5">
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                            Action Taken {notif.resolved_at ? `at ${formatTime(notif.resolved_at)}` : ''}
                                                        </span>
                                                    ) : snoozed ? (
                                                        <span className="text-[#E5DB4C] flex items-center gap-1.5">
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                            Snoozed {notif.snoozed_until ? `until ${formatTime(notif.snoozed_until)}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#E54D4D] flex items-center gap-1.5">
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                            Active Alert
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </React.Fragment>
                    ))
                )}
            </div>

            {line_shape}
            <div className="px-5 py-3.5 text-center">
                <Link to="/dashboard/notifications" className="text-sm text-white hover:text-primary/80 transition-colors">
                    View all notifications
                </Link>
            </div>
        </>
    );
}
