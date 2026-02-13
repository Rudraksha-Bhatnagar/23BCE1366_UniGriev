import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';

const ROLE_LABELS = {
    citizen: 'Citizen',
    officer: 'Department Officer',
    deptAdmin: 'Department Admin',
    sysAdmin: 'System Admin',
};

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className={styles.page}>
            {/* ── Navbar ──────────────────────────────────────────── */}
            <nav className={styles.navbar}>
                <div className={styles.navBrand}>
                    <div className={styles.navLogo}>G</div>
                    <span className={styles.navTitle}>IDOGRMS</span>
                </div>

                <div className={styles.navRight}>
                    <span className={styles.roleBadge}>
                        {ROLE_LABELS[user.role] || user.role}
                    </span>
                    <button
                        className={styles.logoutBtn}
                        onClick={handleLogout}
                        id="logout-btn"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* ── Main ───────────────────────────────────────────── */}
            <main className={styles.main}>
                {/* Welcome */}
                <div className={styles.welcomeSection}>
                    <h1 className={styles.welcomeTitle}>
                        Welcome, {user.name} 👋
                    </h1>
                    <p className={styles.welcomeSubtitle}>
                        Here's an overview of your grievance management dashboard.
                    </p>
                </div>

                {/* User info */}
                <div className={styles.userInfoCard}>
                    <h3 className={styles.sectionTitle}>Your Account</h3>
                    <div className={styles.userInfoGrid}>
                        <div className={styles.userInfoItem}>
                            <span className={styles.userInfoLabel}>Name</span>
                            <span className={styles.userInfoValue}>{user.name}</span>
                        </div>
                        <div className={styles.userInfoItem}>
                            <span className={styles.userInfoLabel}>Email</span>
                            <span className={styles.userInfoValue}>{user.email}</span>
                        </div>
                        <div className={styles.userInfoItem}>
                            <span className={styles.userInfoLabel}>Role</span>
                            <span className={styles.userInfoValue}>
                                {ROLE_LABELS[user.role]}
                            </span>
                        </div>
                        <div className={styles.userInfoItem}>
                            <span className={styles.userInfoLabel}>Account ID</span>
                            <span className={styles.userInfoValue}>
                                {user.id?.slice(-8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats placeholder */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                            📋
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Total Grievances</span>
                            <span className={styles.statValue}>—</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
                            ⏳
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Pending</span>
                            <span className={styles.statValue}>—</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                            ✅
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Resolved</span>
                            <span className={styles.statValue}>—</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconRose}`}>
                            🚨
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Escalated</span>
                            <span className={styles.statValue}>—</span>
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div className={styles.quickActions}>
                    <h3 className={styles.sectionTitle}>Quick Actions</h3>
                    <div className={styles.actionGrid}>
                        <div className={styles.actionCard} id="action-submit-grievance">
                            <span className={styles.actionIcon}>📝</span>
                            <span className={styles.actionLabel}>Submit Grievance</span>
                            <span className={styles.actionDesc}>
                                File a new complaint
                            </span>
                        </div>

                        <div className={styles.actionCard} id="action-track-grievance">
                            <span className={styles.actionIcon}>🔍</span>
                            <span className={styles.actionLabel}>Track Status</span>
                            <span className={styles.actionDesc}>
                                Check grievance progress
                            </span>
                        </div>

                        <div className={styles.actionCard} id="action-view-responses">
                            <span className={styles.actionIcon}>💬</span>
                            <span className={styles.actionLabel}>View Responses</span>
                            <span className={styles.actionDesc}>
                                Read department replies
                            </span>
                        </div>

                        <div className={styles.actionCard} id="action-give-feedback">
                            <span className={styles.actionIcon}>⭐</span>
                            <span className={styles.actionLabel}>Give Feedback</span>
                            <span className={styles.actionDesc}>
                                Rate resolved grievances
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
