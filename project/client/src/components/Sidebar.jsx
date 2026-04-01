import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

const ROLE_LABELS = {
    citizen: 'Citizen',
    officer: 'Officer',
    deptAdmin: 'Dept Admin',
    sysAdmin: 'System Admin',
};

export default function Sidebar() {
    const { user, logout, socket } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifs, setShowNotifs] = useState(false);
    const notifRef = useRef(null);

    const token = localStorage.getItem('accessToken');

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const res = await fetch('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {}
    };

    useEffect(() => {
        fetchNotifications();
    }, [token]);

    // Listen for real-time notifications via socket
    useEffect(() => {
        const sock = socket?.current;
        if (!sock) return;

        const handleNotification = (notif) => {
            setNotifications((prev) => [notif, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
        };

        sock.on('notification', handleNotification);
        return () => sock.off('notification', handleNotification);
    }, [socket?.current]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifs(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleBellClick = async () => {
        setShowNotifs((prev) => !prev);
        if (!showNotifs && unreadCount > 0) {
            // Mark all as read when opening
            try {
                await fetch('/api/notifications/read-all', {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            } catch {}
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const linkClass = ({ isActive }) =>
        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return d.toLocaleDateString();
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.brand}>
                <div className={styles.logoIcon}>G</div>
                <span className={styles.logoText}>UniGriev</span>

                <button className={styles.bellBtn} onClick={handleBellClick} title="Notifications">
                    🔔
                    {unreadCount > 0 && (
                        <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                </button>

                {showNotifs && (
                    <div className={styles.notifDropdown} ref={notifRef}>
                        <div className={styles.notifHeader}>Notifications</div>
                        {notifications.length === 0 ? (
                            <div className={styles.notifEmpty}>No notifications</div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    className={`${styles.notifItem} ${n.isRead ? '' : styles.notifUnread}`}
                                >
                                    <div className={styles.notifMsg}>{n.message}</div>
                                    <div className={styles.notifTime}>{formatTime(n.createdAt)}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <nav className={styles.nav}>
                <NavLink to="/dashboard" className={linkClass}>
                    <span className={styles.navLabel}>Dashboard</span>
                </NavLink>

                <div className={styles.divider} />
                <div className={styles.sectionLabel}>Grievances</div>

                <NavLink to="/submit-grievance" className={linkClass}>
                    <span className={styles.navLabel}>Submit Grievance</span>
                </NavLink>

                <NavLink to="/my-grievances" className={linkClass}>
                    <span className={styles.navLabel}>My Grievances</span>
                </NavLink>

                {(user?.role === 'officer' || user?.role === 'deptAdmin' || user?.role === 'sysAdmin') && (
                    <>
                        <div className={styles.divider} />
                        <div className={styles.sectionLabel}>Management</div>

                        <NavLink to="/assigned-grievances" className={linkClass}>
                            <span className={styles.navLabel}>
                                {user?.role === 'deptAdmin' || user?.role === 'sysAdmin'
                                    ? 'Department Grievances'
                                    : 'Assigned to Me'}
                            </span>
                        </NavLink>
                    </>
                )}

                {(user?.role === 'deptAdmin' || user?.role === 'sysAdmin') && (
                    <NavLink to="/admin/departments" className={linkClass}>
                        <span className={styles.navLabel}>Departments</span>
                    </NavLink>
                )}

                {(user?.role === 'deptAdmin' || user?.role === 'sysAdmin') && (
                    <NavLink to="/admin/analytics" className={linkClass}>
                        <span className={styles.navLabel}>Analytics</span>
                    </NavLink>
                )}

                {user?.role === 'sysAdmin' && (
                    <>
                        <div className={styles.divider} />
                        <div className={styles.sectionLabel}>Administration</div>

                        <NavLink to="/admin/users" className={linkClass}>
                            <span className={styles.navLabel}>Manage Users</span>
                        </NavLink>

                        <NavLink to="/admin/categories" className={linkClass}>
                            <span className={styles.navLabel}>Categories</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div className={styles.footer}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className={styles.userName}>{user?.name}</div>
                        <div className={styles.userRole}>{ROLE_LABELS[user?.role]}</div>
                    </div>
                </div>
                <button className={styles.logoutBtn} onClick={handleLogout} id="sidebar-logout">
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
