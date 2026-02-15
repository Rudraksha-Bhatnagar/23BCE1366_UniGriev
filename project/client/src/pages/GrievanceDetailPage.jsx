import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import styles from './GrievanceDetailPage.module.css';

const STATUS_CLASS = {
    'Submitted': styles.badgeSubmitted,
    'In Review': styles.badgeInReview,
    'In Progress': styles.badgeInProgress,
    'Awaiting Info': styles.badgeAwaitingInfo,
    'Resolved': styles.badgeResolved,
    'Closed': styles.badgeClosed,
    'Escalated': styles.badgeEscalated,
};

export default function GrievanceDetailPage() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch(`/api/grievances/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                setGrievance(data.grievance);
            } catch (err) {
                setError(err.message || 'Failed to load grievance');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Loading...</div></div>;
    if (error) return <div className={styles.page}><Sidebar /><div className={styles.error}>{error}</div></div>;
    if (!grievance) return null;

    const g = grievance;

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <Link to="/my-grievances" className={styles.backLink}>Back to My Grievances</Link>

                <div className={styles.headerCard}>
                    <div className={styles.headerTop}>
                        <span className={styles.grvId}>{g.grievanceId}</span>
                        <span className={`${styles.badge} ${STATUS_CLASS[g.status] || ''}`}>{g.status}</span>
                    </div>
                    <h1 className={styles.grvTitle}>{g.title}</h1>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>Priority</div>
                            <div className={styles.infoValue}>{g.priority}</div>
                        </div>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>Category</div>
                            <div className={styles.infoValue}>{g.category?.name || '\u2014'}</div>
                        </div>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>Department</div>
                            <div className={styles.infoValue}>{g.assignedDepartment?.name || '\u2014'}</div>
                        </div>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>SLA Deadline</div>
                            <div className={styles.infoValue}>
                                {g.slaDeadline ? new Date(g.slaDeadline).toLocaleDateString() : '\u2014'}
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>Submitted</div>
                            <div className={styles.infoValue}>{new Date(g.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className={styles.infoItem}>
                            <div className={styles.infoLabel}>Assigned Officer</div>
                            <div className={styles.infoValue}>{g.assignedOfficer?.name || 'Not yet assigned'}</div>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.descText}>{g.description}</p>
                </div>

                {g.statusHistory && g.statusHistory.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Status Timeline</h3>
                        <div className={styles.timeline}>
                            {[...g.statusHistory].reverse().map((entry, idx) => (
                                <div key={idx} className={styles.timelineItem}>
                                    <div className={styles.timelineDot} />
                                    <div className={styles.timelineStatus}>{entry.status}</div>
                                    <div className={styles.timelineMeta}>
                                        {entry.changedBy?.name || 'System'} &middot;{' '}
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </div>
                                    {entry.note && <div className={styles.timelineNote}>{entry.note}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {g.attachments && g.attachments.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Attachments ({g.attachments.length})</h3>
                        <div className={styles.attachmentList}>
                            {g.attachments.map((att, idx) => (
                                <a
                                    key={idx}
                                    href={att.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.attachmentItem}
                                >
                                    <span>{att.filename}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
