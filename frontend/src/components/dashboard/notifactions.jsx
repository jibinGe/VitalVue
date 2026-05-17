import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

export default function Notifactions() {
    const [allNotifs, setAllNotifs] = useState([]);
    const [grouped, setGrouped] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ackingId, setAckingId] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await patientService.getNotifications(unreadOnly);
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
    }, [unreadOnly]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleAcknowledge = async (alertId) => {
        if (!alertId || ackingId === alertId) return;
        setAckingId(alertId);
        try {
            const res = await patientService.acknowledgeAlert(alertId);
            if (res.success) {
                const updated = allNotifs.filter(
                    (n) => (n._id || n.id || n.alertId) !== alertId
                );
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
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0)_100%)]" />
    );

    return (
        <>
            <div className="flex items-center gap-2 justify-between">
                <h6 className="text-base px-5 py-4 font-medium">
                    Notifications ({totalCount})
                </h6>
                <button
                    className="text-sm transition-colors duration-300 px-5 py-4 text-white font-inter flex items-center gap-1.5 hover:text-primary/80"
                    onClick={() => setUnreadOnly((prev) => !prev)}
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.94878 9.99959L10.2997 13.5L17 6.5M3 9.99959L6.35093 13.5M13.052 6.5L10.5027 9.18698" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {unreadOnly ? 'Show All' : 'Unread Only'}
                </button>
            </div>

            <div className="max-h-150 overflow-y-auto">
                {loading ? (
                    <div className="px-5 py-8 text-center text-para text-sm">Loading notifications...</div>
                ) : grouped.length === 0 ? (
                    <div className="px-5 py-8 text-center text-para text-sm">No notifications found.</div>
                ) : (
                    grouped.map((group, index) => (
                        <React.Fragment key={index}>
                            {line_shape}
                            <div className="px-5 py-3">
                                <span className="font-medium font-inter uppercase text-xs text-white">{group.date}</span>
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

                                    return (
                                        <div className="flex flex-col" key={alertId || idx}>
                                            {line_shape}
                                            <div className={`flex flex-col gap-y-4 px-4 py-5 hover:bg-white/5 transition-colors duration-300 ${status === 'active' ? 'border-l-2 border-primary' : ''}`}>
                                                <div className="flex items-center gap-4 md:gap-5">
                                                    <div><DefaultIcon color={iconColor} /></div>
                                                    <div className="flex-1 flex flex-col gap-y-1.5">
                                                        <h6 className="flex items-center gap-2.5 flex-wrap">
                                                            <span className="text-base font-medium text-white">{title}</span>
                                                            <span className={`min-h-6 flex items-center justify-center px-3 text-xs font-normal rounded-full capitalize ${badgeClass}`}>
                                                                {type}
                                                            </span>
                                                        </h6>
                                                        <div className="flex items-center gap-3 text-sm flex-wrap font-normal">
                                                            <span className="text-[#F1F2F4]">Ward No: <span className="text-white">{wardId}</span></span>
                                                            <span className="text-[#F1F2F4]">Room No: <span className="text-white">{bedId}</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto text-para font-normal text-sm mb-auto">{time}</div>
                                                </div>

                                                <div className="flex items-center gap-3 text-sm">
                                                    {isResolved ? (
                                                        <span className="text-[#4DE573] flex items-center gap-2">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                            Action Taken {notif.resolved_at ? `at ${formatTime(notif.resolved_at)}` : ''}
                                                        </span>
                                                    ) : isSnoozed ? (
                                                        <span className="text-[#E5DB4C] flex items-center gap-2">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                            Snoozed {notif.snoozed_until ? `until ${formatTime(notif.snoozed_until)}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[#E54D4D] flex items-center gap-2">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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
            <div className="px-5 py-4 text-center">
                <Link to="/dashboard/home" className="text-base text-white hover:text-primary/80">View all notifications</Link>
            </div>
        </>
    );
}
