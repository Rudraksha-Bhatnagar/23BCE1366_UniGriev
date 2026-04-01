import { useState, useEffect, useMemo } from 'react';
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

// ── Keyword-based department suggestion ──────────────────────────
const DEPT_KEYWORDS = {
    'Academic Affairs':        ['exam', 'result', 'grade', 'marks', 'faculty', 'professor', 'teacher', 'course', 'curriculum', 'syllabus', 'lecture', 'timetable', 'academic', 'subject', 'attendance'],
    'Administration':          ['id card', 'certificate', 'admission', 'document', 'record', 'enrollment', 'bonafide', 'migration', 'transfer', 'administration', 'office', 'noc'],
    'Finance & Accounts':      ['fee', 'fees', 'payment', 'scholarship', 'stipend', 'refund', 'fine', 'challan', 'finance', 'accounts', 'money', 'dues', 'invoice', 'receipt'],
    'Hostel & Accommodation':  ['hostel', 'room', 'accommodation', 'mess', 'food', 'canteen', 'warden', 'dormitory', 'bed', 'bathroom', 'toilet', 'laundry', 'allotment'],
    'IT & Infrastructure':     ['wifi', 'wi-fi', 'internet', 'network', 'computer', 'lab', 'erp', 'portal', 'software', 'website', 'hardware', 'printer', 'server', 'email', 'it ', 'laptop'],
};

function suggestDepartment(grievance, departments) {
    if (!grievance || !departments.length) return null;
    const text = `${grievance.title || ''} ${grievance.description || ''}`.toLowerCase();
    let bestName = null, bestScore = 0;
    for (const [name, kws] of Object.entries(DEPT_KEYWORDS)) {
        const score = kws.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
        if (score > bestScore) { bestScore = score; bestName = name; }
    }
    if (!bestName || bestScore === 0) return null;
    return departments.find((d) => d.name === bestName) || null;
}
// ─────────────────────────────────────────────────────────────────

export default function ManageGrievancePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [grievance, setGrievance] = useState(null);
    const [officers, setOfficers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [selectedOfficer, setSelectedOfficer] = useState('');
    const [remarkText, setRemarkText] = useState('');

    // Forward state
    const [targetDeptId, setTargetDeptId] = useState('');
    const [transferNote, setTransferNote] = useState('');

    // Admin reassign state
    const [reassignDeptId, setReassignDeptId] = useState('');
    const [reassignReason, setReassignReason] = useState('');

    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        Promise.all([
            fetch(`/api/grievances/${id}`, { headers }).then((r) => r.json()),
            fetch('/api/departments', { headers }).then((r) => r.json()).catch(() => ({ departments: [] })),
        ]).then(([gData, dData]) => {
            const deptId = gData.grievance?.assignedDepartment?._id || gData.grievance?.assignedDepartment || '';
            fetch(`/api/admin/users/officers?departmentId=${deptId}`, { headers }).then((r) => r.json()).then(oData => setOfficers(oData.officers || [])).catch(() => setOfficers([]));
            setGrievance(gData.grievance || null);
            setDepartments(dData.departments || []);
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

    const handleForward = async () => {
        if (!targetDeptId || !transferNote.trim()) {
            showMessage('Select a department and provide a transfer note', true);
            return;
        }
        try {
            const res = await fetch(`/api/grievances/${id}/forward`, {
                method: 'PATCH', headers,
                body: JSON.stringify({ targetDepartmentId: targetDeptId, transferNote }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({
                ...prev,
                assignedDepartment: data.grievance.assignedDepartment,
                assignedOfficer: null,
                status: data.grievance.status,
            }));
            setTargetDeptId('');
            setTransferNote('');
            showMessage(data.message);
        } catch (err) { showMessage(err.message, true); }
    };

    const handleReassign = async () => {
        if (!reassignDeptId) return;
        try {
            const res = await fetch(`/api/grievances/${id}/reassign-department`, {
                method: 'PATCH', headers,
                body: JSON.stringify({ departmentId: reassignDeptId, reason: reassignReason.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setGrievance((prev) => ({
                ...prev,
                assignedDepartment: data.grievance.assignedDepartment,
                assignedOfficer: null,
            }));
            // Refresh officers for the new department
            fetch(`/api/admin/users/officers?departmentId=${data.grievance.assignedDepartment._id}`, { headers })
                .then((r) => r.json()).then((o) => setOfficers(o.officers || [])).catch(() => {});
            setReassignDeptId('');
            setReassignReason('');
            setSelectedOfficer('');
            showMessage(data.message);
        } catch (err) { showMessage(err.message, true); }
    };

    // Keyword-based suggestion (memoized)
    const suggestedDept = useMemo(() => suggestDepartment(grievance, departments), [grievance, departments]);

    if (loading) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Loading...</div></div>;
    if (!grievance) return <div className={styles.page}><Sidebar /><div className={styles.loading}>Grievance not found</div></div>;

    const g = grievance;
    const currentDeptId = g.assignedDepartment?._id || g.assignedDepartment;
    const canAssign = user?.role === 'deptAdmin' || user?.role === 'sysAdmin';
    const canForward = user?.role === 'officer' || user?.role === 'deptAdmin' || user?.role === 'sysAdmin';
    const forwardDepts = departments.filter((d) => d._id.toString() !== currentDeptId?.toString());

    // For reassign: show all departments except the current one
    const reassignableDepts = departments.filter((d) => d._id.toString() !== currentDeptId?.toString());

    // Is the suggestion different from the current dept?
    const showSuggestion = suggestedDept && suggestedDept._id.toString() !== currentDeptId?.toString();

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <Link to="/assigned-grievances" className={styles.backLink}>← Back to Grievances</Link>

                {successMsg && <div className={styles.successMsg}>{successMsg}</div>}
                {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

                {/* Header card */}
                <div className={styles.headerCard}>
                    <div className={styles.headerTop}>
                        <span className={styles.grvId}>{g.grievanceId}</span>
                        <span className={`${styles.badge} ${STATUS_CLASS[g.status] || ''}`}>{g.status}</span>
                    </div>
                    <h1 className={styles.grvTitle}>{g.title}</h1>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Priority</div><div className={styles.infoValue}>{g.priority}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Category</div><div className={styles.infoValue}>{g.category?.name || '—'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Submitted By</div><div className={styles.infoValue}>{g.submittedBy?.name || '—'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Department</div><div className={styles.infoValue}>{g.assignedDepartment?.name || '—'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>Assigned Officer</div><div className={styles.infoValue}>{g.assignedOfficer?.name || 'Unassigned'}</div></div>
                        <div className={styles.infoItem}><div className={styles.infoLabel}>SLA Deadline</div><div className={styles.infoValue}>{g.slaDeadline ? new Date(g.slaDeadline).toLocaleDateString() : '—'}</div></div>
                    </div>
                </div>

                {/* Admin: Reassign Department */}
                {user?.role === 'sysAdmin' && (
                    <div className={styles.adminOverrideSection}>
                        <div className={styles.adminOverrideHeader}>
                            <span className={styles.adminLockIcon}>🔧</span>
                            <span className={styles.adminOverrideTitle}>Department Assignment</span>
                            <span className={styles.adminBadge}>SysAdmin</span>
                        </div>

                        <div className={styles.currentDeptRow}>
                            <span className={styles.currentDeptLabel}>Currently assigned to:</span>
                            <span className={styles.currentDeptValue}>{g.assignedDepartment?.name || 'Unassigned'}</span>
                        </div>

                        {showSuggestion && (
                            <div className={styles.suggestionRow}>
                                <span className={styles.suggestionLabel}>Auto-detected from content:</span>
                                <button
                                    className={styles.suggestionChip}
                                    onClick={() => setReassignDeptId(suggestedDept._id)}
                                    title={`Keyword match: "${suggestedDept.name}"`}
                                >
                                    ✦ {suggestedDept.name}
                                    <span className={styles.suggestionApply}>— apply</span>
                                </button>
                            </div>
                        )}

                        <div className={styles.reassignControls}>
                            <select
                                className={`${styles.select} ${styles.reassignSelect}`}
                                value={reassignDeptId}
                                onChange={(e) => setReassignDeptId(e.target.value)}
                            >
                                <option value="">Select department to reassign…</option>
                                {departments.map((d) => (
                                    <option
                                        key={d._id}
                                        value={d._id}
                                        disabled={d._id.toString() === currentDeptId?.toString()}
                                    >
                                        {d.name}{d._id.toString() === currentDeptId?.toString() ? ' (current)' : ''}
                                    </option>
                                ))}
                            </select>

                            <button
                                className={styles.actionBtnAdmin}
                                onClick={handleReassign}
                                disabled={!reassignDeptId || reassignDeptId === currentDeptId?.toString()}
                            >
                                Reassign
                            </button>
                        </div>

                        <textarea
                            className={styles.reassignReason}
                            placeholder="Reason for reassignment (optional — shown in audit trail)"
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                            rows={2}
                        />
                    </div>
                )}

                {/* Description */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.descText}>{g.description}</p>
                </div>

                {/* Actions */}
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
                                {officers.length === 0 ? (
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                                        No officers in this department. Go to Admin → Manage Users.
                                    </p>
                                ) : (
                                    <>
                                        <select className={styles.select} value={selectedOfficer} onChange={(e) => setSelectedOfficer(e.target.value)}>
                                            <option value="">Select an officer</option>
                                            {officers.map((o) => (
                                                <option key={o._id} value={o._id}>{o.name} ({o.departmentId?.name || o.role})</option>
                                            ))}
                                        </select>
                                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleAssign} disabled={!selectedOfficer}>
                                            Assign
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {canForward && forwardDepts.length > 0 && (
                            <div className={styles.actionGroup}>
                                <label className={styles.actionLabel}>Forward to Department</label>
                                <select className={styles.select} value={targetDeptId} onChange={(e) => setTargetDeptId(e.target.value)}>
                                    <option value="">Select department</option>
                                    {forwardDepts.map((d) => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                                <input
                                    className={styles.statusNote}
                                    placeholder="Transfer note (required)"
                                    value={transferNote}
                                    onChange={(e) => setTransferNote(e.target.value)}
                                />
                                <button
                                    className={`${styles.actionBtn} ${styles.actionBtnWarn}`}
                                    onClick={handleForward}
                                    disabled={!targetDeptId || !transferNote.trim()}
                                >
                                    Forward
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Internal Remarks */}
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

                {/* Status Timeline */}
                {g.statusHistory && g.statusHistory.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Status Timeline</h3>
                        <div className={styles.timeline}>
                            {[...g.statusHistory].reverse().map((entry, idx) => (
                                <div key={idx} className={styles.timelineItem}>
                                    <div className={styles.timelineDot} />
                                    <div className={styles.timelineStatus}>{entry.status}</div>
                                    <div className={styles.timelineMeta}>{entry.changedBy?.name || 'System'} · {new Date(entry.timestamp).toLocaleString()}</div>
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
