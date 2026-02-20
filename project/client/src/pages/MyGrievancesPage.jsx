import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './MyGrievancesPage.module.css';

const STATUS_FILTERS = ['All', 'Submitted', 'In Review', 'In Progress', 'Awaiting Info', 'Resolved', 'Closed', 'Escalated'];

const STATUS_BADGE = {
    'Submitted': styles.badgeSubmitted,
    'In Review': styles.badgeInReview,
    'In Progress': styles.badgeInProgress,
    'Awaiting Info': styles.badgeAwaitingInfo,
    'Resolved': styles.badgeResolved,
    'Closed': styles.badgeClosed,
    'Escalated': styles.badgeEscalated,
};

const CARD_BORDER = {
    'Submitted': styles.cardSubmitted,
    'In Review': styles.cardInProgress,
    'In Progress': styles.cardInProgress,
    'Awaiting Info': styles.cardAwaiting,
    'Resolved': styles.cardResolved,
    'Closed': styles.cardResolved,
    'Escalated': styles.cardEscalated,
};

export default function MyGrievancesPage() {
    const [grievances, setGrievances] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    const fetchGrievances = async (page = 1, status = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const params = new URLSearchParams({ page, limit: 20 });
            if (status && status !== 'All') params.append('status', status);

            const res = await fetch(`/api/grievances?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setGrievances(data.grievances || []);
            setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
        } catch {
            setGrievances([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGrievances(1, statusFilter);
    }, [statusFilter]);

    const getPriorityClass = (p) => {
        if (p === 'Critical') return styles.priorityCritical;
        if (p === 'High') return styles.priorityHigh;
        return '';
    };

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>My Grievances</h1>
                    <Link to="/submit-grievance" className={styles.submitBtn}>
                        ✏️ Submit New
                    </Link>
                </div>

                {/* Status filters */}
                <div className={styles.filters}>
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s}
                            className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className={styles.loading}>Loading grievances...</div>
                ) : grievances.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>📭</div>
                        <p className={styles.emptyText}>No grievances found</p>
                        <Link to="/submit-grievance" className={styles.submitBtn}>Submit Your First Grievance</Link>
                    </div>
                ) : (
                    <>
                        <div className={styles.list}>
                            {grievances.map((g) => (
                                <Link
                                    key={g._id}
                                    to={`/grievance/${g.grievanceId || g._id}`}
                                    className={`${styles.card} ${CARD_BORDER[g.status] || ''}`}
                                >
                                    <div className={styles.cardTop}>
                                        <span className={styles.cardId}>{g.grievanceId}</span>
                                        <span className={`${styles.badge} ${STATUS_BADGE[g.status] || ''}`}>
                                            {g.status}
                                        </span>
                                    </div>
                                    <div className={styles.cardTitle}>{g.title}</div>
                                    <div className={styles.cardDesc}>{g.description}</div>
                                    <div className={styles.cardMeta}>
                                        <span className={`${styles.priorityBadge} ${getPriorityClass(g.priority)}`}>
                                            {g.priority}
                                        </span>
                                        {g.category?.name && (
                                            <span className={styles.metaDepartment}>📁 {g.category.name}</span>
                                        )}
                                        {g.assignedDepartment?.name && (
                                            <span className={styles.metaDepartment}>🏢 {g.assignedDepartment.name}</span>
                                        )}
                                        <span className={styles.metaDate}>
                                            📅 {new Date(g.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className={styles.pagination}>
                                {Array.from({ length: pagination.pages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        className={`${styles.pageBtn} ${pagination.page === i + 1 ? styles.pageBtnActive : ''}`}
                                        onClick={() => fetchGrievances(i + 1, statusFilter)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
