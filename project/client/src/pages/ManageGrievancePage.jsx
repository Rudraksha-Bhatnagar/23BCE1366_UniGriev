import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import styles from './ManageGrievancePage.module.css';

const STATUSES = ['Submitted', 'In Review', 'Awaiting Info', 'In Progress', 'Resolved', 'Closed', 'Escalated'];
const STATUS_CLASS = {
    Submitted: styles.badgeSubmitted, 'In Review': styles.badgeInReview,
    'In Progress': styles.badgeInProgress, 'Awaiting Info': styles.badgeAwaitingInfo,
    Resolved: styles.badgeResolved, Closed: styles.badgeClosed, Escalated: styles.badgeEscalated,
};

export default function ManageGrievancePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [grievance, setGrievance] = useState(null);
    const [officers, setOfficers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [selectedOfficer, setSelectedOfficer] = useState('');
    const [remarkText, setRemarkText] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        Promise.all([
            fetch(`/api/grievances/${id}`, { headers }).then((r) => r.json()),
            fetch('/api/admin/users/officers', { headers }).then((r) => r.json()).catch(() => ({ officers: [] })),
        ]).then(([gData, oData]) => {
            setGrievance(gData.grievance || null);
            setOfficers(oData.officers || []);
            if (gData.grievance) setNewStatus(gData.grievance.status);
        }).finally(() => setLoading(false));
    }, [id]);

    const showMessage = (msg, isError = false) => {
        if (isError) { setErrorMsg(msg); setSuccessMsg(''); }
        else { setSuccessMsg(msg); setErrorMsg(''); }
        setTimeout(() => { setSuccessMsg(''); setErrorMsg(''); }, 4000);
    };

    const handleStatusUpdate = async () => {
        try {
            const res = await fetch(`/api/grievances/${id}/status`, {
                method: 'PATCH', headers, body: JSON.stringify({ status: newStatus, note: statusNote }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({ ...prev, status: newStatus, statusHistory: data.grievance.statusHistory }));
            setStatusNote('');
            showMessage(`Status updated to "${newStatus}"`);
        } catch (err) { showMessage(err.message, true); }
    };

    const handleAssign = async () => {
        if (!selectedOfficer) return;
        try {
            const res = await fetch(`/api/grievances/${id}/assign`, {
                method: 'PATCH', headers, body: JSON.stringify({ officerId: selectedOfficer }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({ ...prev, assignedOfficer: data.grievance.assignedOfficer, status: data.grievance.status }));
            showMessage(data.message);
        } catch (err) { showMessage(err.message, true); }
    };

    const handleAddRemark = async (e) => {
        e.preventDefault();
        if (!remarkText.trim()) return;
        try {
            const res = await fetch(`/api/grievances/${id}/remarks`, {
                method: 'POST', headers, body: JSON.stringify({ text: remarkText }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({ ...prev, remarks: data.remarks }));
            setRemarkText('');
            showMessage('Remark added');
        } catch (err) { showMessage(err.message, true); }
    };

    if (loading) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Loading...</div></div>;
    if (!grievance) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Grievance not found</div></div>;

    const g = grievance;
    const canAssign = user?.role === 'deptAdmin' || user?.role === 'sysAdmin';

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <Link to="/assigned-grievances" className={styles.backLink}>Back to Grievances</Link>

                {successMsg && <div className={styles.successMsg}>{successMsg}</div>}
                {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

                {/* Header */}
                <div className={styles.headerCard}>
                    <div className={styles.headerTop}>
                        <span className={styles.grvId}>{g.grievanceId}</span>
                        <span className={`${styles.badge} ${STATUS_CLASS[g.status] || ''}`}>{g.status}</span>
                    </div>
                    <h1 className={styles.grvTitle}>{g.title}</h1>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Priority</div><div className={styles.infoValue}>{g.priority}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Category</div><div className={styles.infoValue}>{g.category?.name || '\u2014'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Submitted By</div><div className={styles.infoValue}>{g.submittedBy?.name || '\u2014'} ({g.submittedBy?.email || ''})</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Department</div><div className={styles.infoValue}>{g.assignedDepartment?.name || '\u2014'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Assigned Officer</div><div className={styles.infoValue}>{g.assignedOfficer?.name || 'Unassigned'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>SLA Deadline</div><div className={styles.infoValue}>{g.slaDeadline ? new Date(g.slaDeadline).toLocaleDateString() : '\u2014'}</div></div>
                    </div>
                </div>

                {/* Description */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.descText}>{g.description}</p>
                </div>

                {/* Action Panel */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Actions</h3>
                    <div className={styles.actionsGrid}>
                        <div className={styles.actionGroup}>
                            <label className={styles.actionLabel}>Update Status</label>
                            <select className={styles.select} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input className={styles.statusNote} placeholder="Add a note (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleStatusUpdate} disabled={newStatus === g.status && !statusNote}>
                                Update Status
                            </button>
                        </div>

                        {canAssign && (
                            <div className={styles.actionGroup}>
                                <label className={styles.actionLabel}>Assign Officer</label>
                                <select className={styles.select} value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)}>
                                    <option value="">Select an officer</option>
                                    {officers.map((o) => (
                                        <option key={o._id} value={o._id}>{o.name} ({o.role})</option>
                                    ))}
                                </select>
                                <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleAssign} disabled={!selectedOfficer}>
                                    Assign
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Remarks */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Internal Remarks</h3>
                    <form className={styles.remarkForm} onSubmit={handleAddRemark}>
                        <input className={styles.remarkInput} placeholder="Write an internal note..." value={remarkText} onChange={(e) => setRemarkText(e.target.value)} />
                        <button type="submit" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} disabled={!remarkText.trim()}>Add</button>
                    </form>
                    {g.remarks && g.remarks.length > 0 ? (
                        <div className={styles.remarkList}>
                            {[...g.remarks].reverse().map((r, i) => (
                                <div key={i} className={styles.remarkItem}>
                                    <div className={styles.remarkText}>{r.text}</div>
                                    <div className={styles.remarkMeta}>{new Date(r.timestamp).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    ) : <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>No remarks yet</p>}
                </div>

                {/* Timeline */}
                {g.statusHistory && g.statusHistory.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Status Timeline</h3>
                        <div className={styles.timeline}>
                            {[...g.statusHistory].reverse().map((entry, idx) => (
                                <div key={idx} className={styles.timelineItem}>
                                    <div className={styles.timelineDot} />
                                    <div className={styles.timelineStatus}>{entry.status}</div>
                                    <div className={styles.timelineMeta}>{entry.changedBy?.name || 'System'} &middot; {new Date(entry.timestamp).toLocaleString()}</div>
                                    {entry.note && <div className={styles.timelineNote}>{entry.note}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Attachments */}
                {g.attachments && g.attachments.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Attachments ({g.attachments.length})</h3>
                        <div className={styles.attachmentList}>
                            {g.attachments.map((att, idx) => (
                                <a key={idx} href={att.path} target="_blank" rel="noopener noreferrer" className={styles.attachmentItem}>
                                    {att.filename}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
