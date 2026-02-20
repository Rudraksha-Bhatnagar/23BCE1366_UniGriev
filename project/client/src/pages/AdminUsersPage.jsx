import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import styles from './AdminUsersPage.module.css';

const ROLES = ['citizen', 'officer', 'deptAdmin', 'sysAdmin'];
const ROLE_LABELS = { citizen: 'Citizen', officer: 'Officer', deptAdmin: 'Dept Admin', sysAdmin: 'Sys Admin' };
const ROLE_CLASS = { citizen: styles.roleCitizen, officer: styles.roleOfficer, deptAdmin: styles.roleDeptAdmin, sysAdmin: styles.roleSysAdmin };

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [editUser, setEditUser] = useState(null);
    const [editForm, setEditForm] = useState({ role: '', departmentId: '' });
    const [successMsg, setSuccessMsg] = useState('');

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchUsers = (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 15 });
        if (search) params.append('search', search);
        if (roleFilter) params.append('role', roleFilter);

        fetch(`/api/admin/users?${params}`, { headers })
            .then((r) => r.json())
            .then((data) => { setUsers(data.users || []); setPagination(data.pagination || {}); })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
        fetch('/api/departments', { headers }).then((r) => r.json()).then((d) => setDepartments(d.departments || []));
    }, []);

    useEffect(() => { const t = setTimeout(() => fetchUsers(), 300); return () => clearTimeout(t); }, [search, roleFilter]);

    const openEdit = (u) => { setEditUser(u); setEditForm({ role: u.role, departmentId: u.departmentId?._id || '' }); };

    const handleSave = async () => {
        try {
            const res = await fetch(`/api/admin/users/${editUser._id}`, {
                method: 'PATCH', headers, body: JSON.stringify(editForm),
            });
            if (!res.ok) throw new Error('Update failed');
            setEditUser(null);
            setSuccessMsg('User updated');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchUsers(pagination.page);
        } catch { }
    };

    const handleDeactivate = async (userId, name) => {
        if (!confirm(`Deactivate user "${name}"?`)) return;
        await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
        fetchUsers(pagination.page);
    };

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>User Management</h1>
                </div>

                {successMsg && <div className={styles.successMsg}>{successMsg}</div>}

                <div className={styles.toolbar}>
                    <input className={styles.searchInput} placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <select className={styles.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                </div>

                <div className={styles.tableCard}>
                    {loading ? <div className={styles.loading}>Loading...</div> : (
                        <table className={styles.table}>
                            <thead>
                                <tr><th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr><td colSpan={6} className={styles.empty}>No users found</td></tr>
                                ) : users.map((u) => (
                                    <tr key={u._id}>
                                        <td>
                                            <div className={styles.userName}>{u.name}</div>
                                            <div className={styles.userEmail}>{u.email}</div>
                                        </td>
                                        <td><span className={`${styles.roleBadge} ${ROLE_CLASS[u.role] || ''}`}>{ROLE_LABELS[u.role]}</span></td>
                                        <td>{u.departmentId?.name || '—'}</td>
                                        <td><span className={`${styles.activeBadge} ${u.isActive ? styles.activeTrue : styles.activeFalse}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button className={styles.actionBtn} onClick={() => openEdit(u)}>Edit</button>
                                            {u.isActive && <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => handleDeactivate(u._id, u.name)}>Deactivate</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {pagination.pages > 1 && (
                    <div className={styles.pagination}>
                        {Array.from({ length: pagination.pages }, (_, i) => (
                            <button key={i + 1} className={`${styles.pageBtn} ${pagination.page === i + 1 ? styles.pageBtnActive : ''}`} onClick={() => fetchUsers(i + 1)}>{i + 1}</button>
                        ))}
                    </div>
                )}

                {/* Edit modal */}
                {editUser && (
                    <div className={styles.modal} onClick={() => setEditUser(null)}>
                        <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>Edit User — {editUser.name}</h3>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Role</label>
                                <select className={styles.select} value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Department</label>
                                <select className={styles.select} value={editForm.departmentId} onChange={(e) => setEditForm((p) => ({ ...p, departmentId: e.target.value }))}>
                                    <option value="">None</option>
                                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.btnSecondary} onClick={() => setEditUser(null)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={handleSave}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
