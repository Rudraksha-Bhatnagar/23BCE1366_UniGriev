import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './DashboardPage.module.css';

const ROLE_LABELS = {
    citizen: 'Citizen',
    officer: 'Department Officer',
    deptAdmin: 'Department Admin',
    sysAdmin: 'System Admin',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, escalated: 0 });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        fetch('/api/grievances/stats', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setStats({
                total: data.total || 0,
                pending: data.pending || 0,
                resolved: data.resolved || 0,
                escalated: data.escalated || 0,
            }))
            .catch(() => {})
            .finally(() => setStatsLoading(false));
    }, []);

    if (!user) return null;

    return (
        <div className={styles.page}>
            <Sidebar />

            <main className={styles.main}>
                <div className={styles.welcomeSection}>
                    <h1 className={styles.welcomeTitle}>Welcome back, {user.name}</h1>
                    <p className={styles.welcomeSubtitle}>
                        Here is an overview of your grievance management dashboard.
                    </p>
                </div>

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
                            <span className={styles.userInfoValue}>{ROLE_LABELS[user.role]}</span>
                        </div>
                        <div className={styles.userInfoItem}>
                            <span className={styles.userInfoLabel}>Account ID</span>
                            <span className={styles.userInfoValue}>{user.id?.slice(-8).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconBlue}`}>T</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Total Grievances</span>
                            <span className={styles.statValue}>{statsLoading ? '...' : stats.total}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconAmber}`}>P</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Pending</span>
                            <span className={styles.statValue}>{statsLoading ? '...' : stats.pending}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconGreen}`}>R</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Resolved</span>
                            <span className={styles.statValue}>{statsLoading ? '...' : stats.resolved}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconRose}`}>E</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Escalated</span>
                            <span className={styles.statValue}>{statsLoading ? '...' : stats.escalated}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.quickActions}>
                    <h3 className={styles.sectionTitle}>Quick Actions</h3>
                    <div className={styles.actionGrid}>
                        <Link to="/submit-grievance" className={styles.actionCard}>
                            <span className={styles.actionLabel}>Submit Grievance</span>
                            <span className={styles.actionDesc}>File a new complaint</span>
                        </Link>
                        <Link to="/my-grievances" className={styles.actionCard}>
                            <span className={styles.actionLabel}>Track Status</span>
                            <span className={styles.actionDesc}>Check grievance progress</span>
                        </Link>
                        <Link to="/my-grievances" className={styles.actionCard}>
                            <span className={styles.actionLabel}>View Responses</span>
                            <span className={styles.actionDesc}>Read department replies</span>
                        </Link>
                        <Link to="/my-grievances" className={styles.actionCard}>
                            <span className={styles.actionLabel}>Give Feedback</span>
                            <span className={styles.actionDesc}>Rate resolved grievances</span>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
