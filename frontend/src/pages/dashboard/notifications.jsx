import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';

const DefaultIcon = ({ color = '#9855F7' }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill={color} />
        <path d="M14 24.625H18L20.3333 20.875L24 29L28 19L30.6667 24.625H34" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const typeColorMap = {
    critical: 'bg-[#E54D4D]/15 text-[#E54D4D]',
    warning: 'bg-[#E5DB4D]/15 text-[#E5DB4C]',
    stable: 'bg-[#4DE573]/15 text-[#4DE573]',
    info: 'bg-[#4D8AE5]/15 text-[#4D8AE5]',
};

const iconColorMap = {
    critical: '#E54D4D',
    warning: '#E5AD00',
    stable: '#1AB340',
    info: '#9855F7',
};

function groupByDate(notifications) {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    notifications.forEach((n) => {
        const d = new Date(n.created_at || n.createdAt || n.timestamp || Date.now());
        d.setHours(0, 0, 0, 0);
        let label;
        if (d.getTime() === today.getTime()) label = 'Today';
        else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
        else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!groups[label]) groups[label] = [];
        groups[label].push(n);
    });

    return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [allNotifs, setAllNotifs] = useState([]);
    const [grouped, setGrouped] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const limit = 50;

    const observer = useRef();
    const lastNotifElementRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setSkip(prevSkip => prevSkip + limit);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchNotifications = useCallback(async (isInitial = true, currentSkip = 0) => {
        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const res = await patientService.getNotifications(unreadOnly, currentSkip, limit);
            if (res.success) {
                if (isInitial) {
                    setAllNotifs(res.data);
                    setTotalCount(res.count || res.data.length);
                    setGrouped(groupByDate(res.data));
                } else {
                    const newNotifs = [...allNotifs, ...res.data];
                    setAllNotifs(newNotifs);
                    setGrouped(groupByDate(newNotifs));
                }
                setHasMore(res.data.length === limit);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [unreadOnly, allNotifs, limit]);

    // Initial load and when unreadOnly changes
    useEffect(() => {
        setSkip(0);
        setAllNotifs([]);
        setGrouped([]);
        setHasMore(true);
        fetchNotifications(true, 0);
    }, [unreadOnly]);

    // Load more when skip changes
    useEffect(() => {
        if (skip > 0) {
            fetchNotifications(false, skip);
        }
    }, [skip]);

    const line_shape = (
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
    );

    return (
        <div className="p-4 md:p-8  w-full">
            <div className="bg-[#222225] rounded-3xl border border-solid border-white/16 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
                <div className="flex items-center gap-4 justify-between p-6 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Notifications</h2>
                            <p className="text-para text-sm mt-1">You have {totalCount} total notifications</p>
                        </div>
                    </div>

                    <button
                        className="text-sm transition-colors duration-300 px-5 py-3 rounded-full border border-white/10 bg-[#373739] text-white font-inter flex items-center gap-2 hover:bg-primary/40 hover:border-primary/50"
                        onClick={() => setUnreadOnly((prev) => !prev)}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.94878 9.99959L10.2997 13.5L17 6.5M3 9.99959L6.35093 13.5M13.052 6.5L10.5027 9.18698" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {unreadOnly ? 'Show All Notifications' : 'Show Unread Only'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="px-5 py-12 text-center text-para text-base flex flex-col items-center justify-center h-full">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                            Loading notifications...
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="px-5 py-12 text-center text-para text-base flex flex-col items-center justify-center h-full">
                            <svg className="w-16 h-16 text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            No notifications found.
                        </div>
                    ) : (
                        <div className="space-y-6 pb-6">
                            {grouped.map((group, groupIndex) => (
                                <div key={groupIndex} className="bg-[#2A2A2D] rounded-2xl overflow-hidden border border-white/5">
                                    <div className="px-6 py-4 bg-white/5 border-b border-white/5">
                                        <span className="font-semibold text-sm text-white tracking-wider">{group.date}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        {group.items.map((notif, idx) => {
                                            const alertId = notif.id || notif._id || notif.alertId;
                                            const type = (notif.severity || notif.type || notif.priority || 'info').toLowerCase();
                                            const badgeClass = typeColorMap[type] || typeColorMap.info;
                                            const iconColor = iconColorMap[type] || iconColorMap.info;
                                            const title = notif.vital_type ? `${notif.patient_name}: ${notif.vital_type} (${notif.triggered_value})` : (notif.title || notif.message || 'Notification');
                                            const wardId = notif.ward_id || notif.wardId || '—';
                                            const bedId = notif.room_id || notif.bedId || '—';
                                            const time = formatTime(notif.created_at || notif.createdAt || notif.timestamp);

                                            const status = notif.status || 'active';
                                            const isResolved = notif.is_resolved || status === 'resolved';
                                            const isSnoozed = status === 'snoozed';

                                            const isLastElement = groupIndex === grouped.length - 1 && idx === group.items.length - 1;

                                            return (
                                                <div
                                                    key={alertId || idx}
                                                    ref={isLastElement ? lastNotifElementRef : null}
                                                    className={`flex flex-col ${idx !== 0 ? 'border-t border-white/5' : ''}`}
                                                >
                                                    <div className={`flex flex-col gap-y-4 px-6 py-6 hover:bg-white/5 transition-colors duration-300 ${status === 'active' ? 'border-l-4 border-primary' : 'border-l-4 border-transparent'}`}>
                                                        <div className="flex items-start gap-4 md:gap-5">
                                                            <div className="shrink-0 mt-1"><DefaultIcon color={iconColor} /></div>
                                                            <div className="flex-1 flex flex-col gap-y-2">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <h6 className="flex items-center gap-3 flex-wrap">
                                                                        <span className="text-lg font-medium text-white leading-tight">{title}</span>
                                                                        <span className={`flex items-center justify-center px-3 py-1 text-xs font-medium rounded-full capitalize ${badgeClass}`}>
                                                                            {type}
                                                                        </span>
                                                                    </h6>
                                                                    <div className="shrink-0 text-para font-medium text-sm bg-white/5 px-3 py-1 rounded-full">{time}</div>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-4 text-sm font-normal">
                                                                    <span className="text-[#F1F2F4] flex items-center gap-2">
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-para"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                                                        Ward: <span className="text-white font-medium">{wardId}</span>
                                                                    </span>
                                                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                                    <span className="text-[#F1F2F4] flex items-center gap-2">
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-para"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                                                        Room: <span className="text-white font-medium">{bedId}</span>
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-3 text-sm mt-1">
                                                                    {isResolved ? (
                                                                        <span className="text-[#4DE573] flex items-center gap-2 bg-[#4DE573]/10 px-3 py-1.5 rounded-lg w-fit">
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                                            Action Taken {notif.resolved_at ? `at ${formatTime(notif.resolved_at)}` : ''}
                                                                        </span>
                                                                    ) : isSnoozed ? (
                                                                        <span className="text-[#E5DB4C] flex items-center gap-2 bg-[#E5DB4C]/10 px-3 py-1.5 rounded-lg w-fit">
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                                            Snoozed {notif.snoozed_until ? `until ${formatTime(notif.snoozed_until)}` : ''}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[#E54D4D] flex items-center gap-2 bg-[#E54D4D]/10 px-3 py-1.5 rounded-lg w-fit">
                                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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

                            {loadingMore && (
                                <div className="py-6 flex justify-center">
                                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                </div>
                            )}

                            {!hasMore && grouped.length > 0 && (
                                <div className="py-8 text-center text-para">
                                    You have reached the end of notifications
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
