import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import styles from './AssignedGrievancesPage.module.css';

const STATUS_FILTERS = ['All', 'Submitted', 'In Review', 'In Progress', 'Awaiting Info', 'Resolved', 'Escalated'];
const STATUS_BADGE = {
    Submitted: styles.badgeSubmitted, 'In Review': styles.badgeInReview,
    'In Progress': styles.badgeInProgress, 'Awaiting Info': styles.badgeAwaitingInfo,
    Resolved: styles.badgeResolved, Closed: styles.badgeClosed, Escalated: styles.badgeEscalated,
};

export default function AssignedGrievancesPage() {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const params = new URLSearchParams({ limit: 50 });
        if (statusFilter !== 'All') params.append('status', statusFilter);

        fetch(`/api/grievances?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data) => setGrievances(data.grievances || []))
            .catch(() => setGrievances([]))
            .finally(() => setLoading(false));
    }, [statusFilter]);

    const pageTitle = user?.role === 'deptAdmin' ? 'Department Grievances' : 'Assigned Grievances';

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{pageTitle}</h1>
                </div>

                <div className={styles.filters}>
                    {STATUS_FILTERS.map((s) => (
                        <button key={s} className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
                            onClick={() => { setStatusFilter(s); setLoading(true); }}>{s}</button>
                    ))}
                </div>

                {loading ? (
                    <div className={styles.loading}>Loading...</div>
                ) : grievances.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No grievances found{statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {grievances.map((g) => (
                            <Link key={g._id} to={`/manage-grievance/${g.grievanceId || g._id}`} className={styles.card}>
                                <div className={styles.cardTop}>
                                    <span className={styles.cardId}>{g.grievanceId}</span>
                                    <span className={`${styles.badge} ${STATUS_BADGE[g.status] || ''}`}>{g.status}</span>
                                </div>
                                <div className={styles.cardTitle}>{g.title}</div>
                                <div className={styles.cardDesc}>{g.description}</div>
                                <div className={styles.cardMeta}>
                                    <span className={styles.metaItem}>{g.category?.name || '\u2014'}</span>
                                    <span className={styles.metaItem}>{g.priority}</span>
                                    <span className={styles.metaItem}>By: {g.submittedBy?.name || '\u2014'}</span>
                                    <span className={styles.metaItem}>
                                        {g.assignedOfficer?.name ? `Officer: ${g.assignedOfficer.name}` : 'Unassigned'}
                                    </span>
                                    <span className={styles.metaItem}>{new Date(g.createdAt).toLocaleDateString()}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
