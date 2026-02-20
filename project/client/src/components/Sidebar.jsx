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
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const linkClass = ({ isActive }) =>
        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

    return (
        <aside className={styles.sidebar}>
            {/* Brand */}
            <div className={styles.brand}>
                <div className={styles.logoIcon}>G</div>
                <span className={styles.logoText}>IDOGRMS</span>
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
                <NavLink to="/dashboard" className={linkClass}>
                    <span className={styles.navIcon}>🏠</span>
                    <span className={styles.navLabel}>Dashboard</span>
                </NavLink>

                <div className={styles.divider} />
                <div className={styles.sectionLabel}>Grievances</div>

                <NavLink to="/submit-grievance" className={linkClass}>
                    <span className={styles.navIcon}>✏️</span>
                    <span className={styles.navLabel}>Submit Grievance</span>
                </NavLink>

                <NavLink to="/my-grievances" className={linkClass}>
                    <span className={styles.navIcon}>📋</span>
                    <span className={styles.navLabel}>My Grievances</span>
                </NavLink>

                {/* Officer/Admin links (Phase 3+) */}
                {(user?.role === 'officer' || user?.role === 'deptAdmin' || user?.role === 'sysAdmin') && (
                    <>
                        <div className={styles.divider} />
                        <div className={styles.sectionLabel}>Management</div>

                        <NavLink to="/assigned-grievances" className={linkClass}>
                            <span className={styles.navIcon}>📥</span>
                            <span className={styles.navLabel}>Assigned to Me</span>
                        </NavLink>
                    </>
                )}

                {(user?.role === 'deptAdmin' || user?.role === 'sysAdmin') && (
                    <NavLink to="/department" className={linkClass}>
                        <span className={styles.navIcon}>🏢</span>
                        <span className={styles.navLabel}>Department</span>
                    </NavLink>
                )}

                {user?.role === 'sysAdmin' && (
                    <>
                        <div className={styles.divider} />
                        <div className={styles.sectionLabel}>Administration</div>

                        <NavLink to="/admin/users" className={linkClass}>
                            <span className={styles.navIcon}>👥</span>
                            <span className={styles.navLabel}>Manage Users</span>
                        </NavLink>

                        <NavLink to="/admin/departments" className={linkClass}>
                            <span className={styles.navIcon}>🏛️</span>
                            <span className={styles.navLabel}>Manage Depts</span>
                        </NavLink>
                    </>
                )}
            </nav>

            {/* Footer — user info + logout */}
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
