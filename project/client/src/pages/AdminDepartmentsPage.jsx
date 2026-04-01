import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import styles from './AdminDepartmentsPage.module.css';

export default function AdminDepartmentsPage() {
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [officers, setOfficers] = useState([]);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editDept, setEditDept] = useState(null);
    const [form, setForm] = useState({ name: '', contactEmail: '' });
    const [successMsg, setSuccessMsg] = useState('');

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/departments', { headers }).then((r) => r.json()),
            fetch('/api/categories', { headers }).then((r) => r.json()),
            fetch('/api/admin/users/officers', { headers }).then((r) => r.json()).catch(() => ({ officers: [] })),
            fetch('/api/grievances?limit=1000', { headers }).then((r) => r.json()).catch(() => ({ grievances: [] })),
        ]).then(([dData, cData, oData, gData]) => {
            setDepartments(dData.departments || []);
            setCategories(cData.categories || []);
            setOfficers(oData.officers || []);
            setGrievances(gData.grievances || []);
        }).finally(() => setLoading(false));
    };

    useEffect(fetchData, []);

    const getCategoriesForDept = (deptId) => categories.filter((c) => {
        const cDeptId = c.departmentId?._id || c.departmentId;
        return cDeptId === deptId;
    });

    const getOfficersForDept = (deptId) => officers.filter((o) => {
        const oDeptId = o.departmentId?._id || o.departmentId;
        return oDeptId === deptId;
    });

    const getGrievanceCounts = (deptId) => {
        const deptGrievs = grievances.filter(g => {
            const gDeptId = g.assignedDepartment?._id || g.assignedDepartment;
            return gDeptId === deptId;
        });
        const pending = deptGrievs.filter(g => ['Submitted', 'In Review', 'Awaiting Info', 'In Progress'].includes(g.status)).length;
        const resolved = deptGrievs.filter(g => ['Resolved', 'Closed'].includes(g.status)).length;
        const escalated = deptGrievs.filter(g => g.status === 'Escalated').length;
        return { total: deptGrievs.length, pending, resolved, escalated };
    };

    const openCreate = () => { setEditDept(null); setForm({ name: '', contactEmail: '' }); setShowModal(true); };
    const openEdit = (dept) => { setEditDept(dept); setForm({ name: dept.name, contactEmail: dept.contactEmail }); setShowModal(true); };

    const handleSave = async () => {
        try {
            const url = editDept ? `/api/departments/${editDept._id}` : '/api/departments';
            const method = editDept ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (!res.ok) throw new Error('Failed');
            setShowModal(false);
            setSuccessMsg(editDept ? 'Department updated' : 'Department created');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchData();
        } catch { }
    };

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Department Management</h1>
                    <button className={styles.addBtn} onClick={openCreate}>+ New Department</button>
                </div>

                {successMsg && <div className={styles.successMsg}>{successMsg}</div>}

                {loading ? <div className={styles.loading}>Loading...</div> : (
                    <div className={styles.grid}>
                        {departments.map((dept) => {
                            const deptCats = getCategoriesForDept(dept._id);
                            const deptOfficers = getOfficersForDept(dept._id);
                            const stats = getGrievanceCounts(dept._id);

                            return (
                                <div key={dept._id} className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <span className={styles.deptName}>{dept.name}</span>
                                        <span className={`${styles.activeBadge} ${dept.isActive ? styles.activeTrue : styles.activeFalse}`}>
                                            {dept.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className={styles.deptEmail}>{dept.contactEmail}</div>
                                    
                                    <div className={styles.statsRow}>
                                        <span className={styles.statLabel}>Pending: {stats.pending}</span>
                                        <span className={styles.statLabel}>Resolved: {stats.resolved}</span>
                                        <span className={styles.statLabel}>Escalated: {stats.escalated}</span>
                                    </div>

                                    {deptOfficers.length > 0 && (
                                        <>
                                            <div className={styles.catLabel}>Officers ({deptOfficers.length})</div>
                                            <div className={styles.catList}>
                                                {deptOfficers.map((o) => (
                                                    <span key={o._id} className={styles.catChip} style={{backgroundColor: '#e0f2fe', color: '#0369a1'}}>
                                                        {o.name} ({o.role === 'deptAdmin' ? 'Admin' : 'Officer'})
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {deptCats.length > 0 && (
                                        <>
                                            <div className={styles.catLabel}>Categories ({deptCats.length})</div>
                                            <div className={styles.catList}>
                                                {deptCats.map((c) => (
                                                    <span key={c._id} className={styles.catChip}>
                                                        {c.name}<span className={styles.catSla}>{c.slaDays}d</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    <div className={styles.cardActions}>
                                        <button className={styles.editBtn} onClick={() => openEdit(dept)}>Edit</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showModal && (
                    <div className={styles.modal} onClick={() => setShowModal(false)}>
                        <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>{editDept ? 'Edit Department' : 'New Department'}</h3>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Name</label>
                                <input className={styles.input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Department name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Contact Email</label>
                                <input className={styles.input} value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="email@institution.edu" />
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={handleSave}>{editDept ? 'Save Changes' : 'Create'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
