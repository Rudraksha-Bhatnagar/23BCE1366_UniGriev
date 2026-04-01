import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import styles from './AdminCategoriesPage.module.css';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editCat, setEditCat] = useState(null);
    const [form, setForm] = useState({ name: '', departmentId: '', slaDays: 7, description: '' });
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = () => {
        setLoading(true);
        Promise.all([
            fetch('/api/categories', { headers }).then((r) => r.json()),
            fetch('/api/departments', { headers }).then((r) => r.json()),
        ]).then(([cData, dData]) => {
            setCategories(cData.categories || []);
            setDepartments(dData.departments || []);
        }).finally(() => setLoading(false));
    };

    useEffect(fetchData, []);

    const openCreate = () => {
        setEditCat(null);
        setForm({ name: '', departmentId: '', slaDays: 7, description: '' });
        setShowModal(true);
    };

    const openEdit = (cat) => {
        setEditCat(cat);
        setForm({
            name: cat.name,
            departmentId: cat.departmentId?._id || cat.departmentId || '',
            slaDays: cat.slaDays,
            description: cat.description || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setErrorMsg('');
        if (!form.name.trim() || !form.departmentId) {
            setErrorMsg('Name and department are required');
            return;
        }
        try {
            const url = editCat ? `/api/categories/${editCat._id}` : '/api/categories';
            const method = editCat ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Operation failed');
            }
            setShowModal(false);
            setSuccessMsg(editCat ? 'Category updated' : 'Category created');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchData();
        } catch (err) {
            setErrorMsg(err.message);
        }
    };

    const getDeptName = (cat) => {
        if (cat.departmentId?.name) return cat.departmentId.name;
        const dept = departments.find((d) => d._id === cat.departmentId);
        return dept?.name || '\u2014';
    };

    const groupedByDept = departments.map((dept) => ({
        ...dept,
        cats: categories.filter((c) => {
            const cDeptId = c.departmentId?._id || c.departmentId;
            return cDeptId === dept._id;
        }),
    })).filter((d) => d.cats.length > 0);

    const ungroupedCats = categories.filter((c) => {
        const cDeptId = c.departmentId?._id || c.departmentId;
        return !departments.some((d) => d._id === cDeptId);
    });

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Category Management</h1>
                    <button className={styles.addBtn} onClick={openCreate}>+ New Category</button>
                </div>

                {successMsg && <div className={styles.successMsg}>{successMsg}</div>}

                {loading ? <div className={styles.loading}>Loading...</div> : (
                    <>
                        {groupedByDept.map((dept) => (
                            <div key={dept._id} className={styles.deptSection}>
                                <h3 className={styles.deptTitle}>{dept.name}</h3>
                                <div className={styles.catGrid}>
                                    {dept.cats.map((cat) => (
                                        <div key={cat._id} className={styles.catCard}>
                                            <div className={styles.catHeader}>
                                                <span className={styles.catName}>{cat.name}</span>
                                                <span className={styles.slaChip}>{cat.slaDays} day SLA</span>
                                            </div>
                                            {cat.description && (
                                                <p className={styles.catDesc}>{cat.description}</p>
                                            )}
                                            <div className={styles.catActions}>
                                                <button className={styles.editBtn} onClick={() => openEdit(cat)}>Edit</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {ungroupedCats.length > 0 && (
                            <div className={styles.deptSection}>
                                <h3 className={styles.deptTitle}>Uncategorized</h3>
                                <div className={styles.catGrid}>
                                    {ungroupedCats.map((cat) => (
                                        <div key={cat._id} className={styles.catCard}>
                                            <div className={styles.catHeader}>
                                                <span className={styles.catName}>{cat.name}</span>
                                                <span className={styles.slaChip}>{cat.slaDays} day SLA</span>
                                            </div>
                                            {cat.description && <p className={styles.catDesc}>{cat.description}</p>}
                                            <div className={styles.catActions}>
                                                <button className={styles.editBtn} onClick={() => openEdit(cat)}>Edit</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {showModal && (
                    <div className={styles.modal} onClick={() => setShowModal(false)}>
                        <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.modalTitle}>{editCat ? 'Edit Category' : 'New Category'}</h3>

                            {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Name</label>
                                <input
                                    className={styles.input}
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="Category name"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Department</label>
                                <select
                                    className={styles.select}
                                    value={form.departmentId}
                                    onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                                >
                                    <option value="">Select department</option>
                                    {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>SLA Days</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min="1"
                                    value={form.slaDays}
                                    onChange={(e) => setForm((p) => ({ ...p, slaDays: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description (optional)</label>
                                <input
                                    className={styles.input}
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder="Brief description"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button className={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={handleSave}>{editCat ? 'Save Changes' : 'Create'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
