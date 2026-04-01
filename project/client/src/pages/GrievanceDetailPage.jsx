import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import styles from './GrievanceDetailPage.module.css';

const PENDING_STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'];

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
    const { user } = useAuth();
    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackHover, setFeedbackHover] = useState(0);
    const [feedbackComments, setFeedbackComments] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState('');

    // Escalation state
    const [escalateReason, setEscalateReason] = useState('');
    const [escalating, setEscalating] = useState(false);
    const [escalateMsg, setEscalateMsg] = useState('');

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
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

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (feedbackRating === 0) return;
        setFeedbackSubmitting(true);
        try {
            const res = await fetch(`/api/grievances/${id}/feedback`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: feedbackRating, comments: feedbackComments }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({ ...prev, feedback: data.feedback }));
            setFeedbackMsg('Thank you for your feedback!');
        } catch (err) {
            setFeedbackMsg(err.message);
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    const handleEscalate = async () => {
        setEscalating(true);
        setEscalateMsg('');
        try {
            const res = await fetch(`/api/grievances/${id}/escalate`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: escalateReason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({
                ...prev,
                status: 'Escalated',
                statusHistory: data.grievance.statusHistory,
            }));
            setEscalateMsg('Grievance escalated successfully.');
            setEscalateReason('');
        } catch (err) {
            setEscalateMsg(err.message);
        } finally {
            setEscalating(false);
        }
    };

    if (loading) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Loading...</div></div>;
    if (error) return <div className={styles.page}><Sidebar /><div className={styles.error}>{error}</div></div>;
    if (!grievance) return null;

    const g = grievance;
    const canFeedback = user?.role === 'citizen'
        && ['Resolved', 'Closed'].includes(g.status)
        && g.submittedBy?._id === user?.id
        && !g.feedback?.rating;

    const canEscalate = user?.role === 'citizen'
        && g.submittedBy?._id === user?.id
        && PENDING_STATUSES.includes(g.status);

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

                {canEscalate && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Escalate Grievance</h3>
                        <p className={styles.escalateInfo}>
                            Not satisfied with the progress? Escalate to a higher authority for urgent attention.
                        </p>
                        {escalateMsg && (
                            <div className={escalateMsg.includes('success') ? styles.successMsg : styles.errorMsg}>
                                {escalateMsg}
                            </div>
                        )}
                        <div className={styles.escalateForm}>
                            <input
                                className={styles.escalateInput}
                                placeholder="Reason for escalation (optional)"
                                value={escalateReason}
                                onChange={(e) => setEscalateReason(e.target.value)}
                            />
                            <button
                                className={styles.escalateBtn}
                                onClick={handleEscalate}
                                disabled={escalating}
                            >
                                {escalating ? 'Escalating...' : 'Escalate'}
                            </button>
                        </div>
                    </div>
                )}

                {g.feedback?.rating ? (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Your Feedback</h3>
                        <div className={styles.feedbackDisplay}>
                            <div className={styles.starRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={`${styles.star} ${star <= g.feedback.rating ? styles.starFilled : ''}`}>★</span>
                                ))}
                                <span className={styles.ratingText}>{g.feedback.rating}/5</span>
                            </div>
                            {g.feedback.comments && <p className={styles.feedbackComment}>{g.feedback.comments}</p>}
                            <p className={styles.feedbackDate}>Submitted on {new Date(g.feedback.submittedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ) : canFeedback ? (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Rate Your Experience</h3>
                        {feedbackMsg && <div className={styles.feedbackMsg}>{feedbackMsg}</div>}
                        <form className={styles.feedbackForm} onSubmit={handleFeedbackSubmit}>
                            <div className={styles.starRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`${styles.starBtn} ${star <= (feedbackHover || feedbackRating) ? styles.starFilled : ''}`}
                                        onClick={() => setFeedbackRating(star)}
                                        onMouseEnter={() => setFeedbackHover(star)}
                                        onMouseLeave={() => setFeedbackHover(0)}
                                    >
                                        ★
                                    </button>
                                ))}
                                {feedbackRating > 0 && <span className={styles.ratingText}>{feedbackRating}/5</span>}
                            </div>
                            <textarea
                                className={styles.feedbackTextarea}
                                placeholder="Share your experience (optional)..."
                                value={feedbackComments}
                                onChange={(e) => setFeedbackComments(e.target.value)}
                                rows={3}
                            />
                            <button
                                type="submit"
                                className={styles.feedbackSubmitBtn}
                                disabled={feedbackRating === 0 || feedbackSubmitting}
                            >
                                {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </form>
                    </div>
                ) : null}

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
