import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import styles from './SubmitGrievancePage.module.css';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function SubmitGrievancePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'Medium' });
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Fetch categories on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data) => setCategories(data.categories || []))
            .catch(() => { });
    }, []);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    };

    // File handling
    const addFiles = (newFiles) => {
        const arr = Array.from(newFiles);
        setFiles((prev) => [...prev, ...arr].slice(0, 5));
    };
    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));
    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const validate = () => {
        const errs = {};
        if (!form.title.trim()) errs.title = 'Title is required';
        if (!form.description.trim()) errs.description = 'Description is required';
        if (!form.category) errs.category = 'Please select a category';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('description', form.description);
            formData.append('category', form.category);
            formData.append('priority', form.priority);
            files.forEach((f) => formData.append('attachments', f));

            const token = localStorage.getItem('accessToken');
            const res = await fetch('/api/grievances', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Submission failed');

            // Navigate to confirmation
            navigate('/grievance-submitted', { state: { grievance: data.grievance } });
        } catch (err) {
            setServerError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Submit a Grievance</h1>
                    <p className={styles.subtitle}>Fill in the details below. Your complaint will be routed to the appropriate department automatically.</p>
                </div>

                <div className={styles.card}>
                    {serverError && <div className={styles.errorAlert}>{serverError}</div>}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {/* Title */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="grv-title">Grievance Title</label>
                            <input id="grv-title" className={styles.input} name="title" placeholder="Brief summary of your complaint" value={form.title} onChange={handleChange} />
                            {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
                        </div>

                        {/* Category & Priority row */}
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="grv-category">Category</label>
                                <select id="grv-category" className={styles.select} name="category" value={form.category} onChange={handleChange}>
                                    <option value="">Select a category</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name} {cat.departmentId ? `(${cat.departmentId.name})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && <span className={styles.fieldError}>{errors.category}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Priority</label>
                                <div className={styles.priorityGroup}>
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`${styles.priorityBtn} ${styles[`priority${p}`]} ${form.priority === p ? styles.priorityBtnActive : ''}`}
                                            onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="grv-desc">Description</label>
                            <textarea id="grv-desc" className={styles.textarea} name="description" placeholder="Describe your grievance in detail..." value={form.description} onChange={handleChange} />
                            {errors.description && <span className={styles.fieldError}>{errors.description}</span>}
                        </div>

                        {/* File upload */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Supporting Documents (optional, max 5 files)</label>
                            <div
                                className={`${styles.dropzone} ${dragOver ? styles.dropzoneDragOver : ''}`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={styles.dropzoneIcon}>📎</div>
                                <p className={styles.dropzoneText}>
                                    Drag &amp; drop files here, or <span className={styles.dropzoneLink}>browse</span>
                                </p>
                                <p className={styles.dropzoneText}>PDF, JPG, PNG, DOC — max 5 MB each</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    style={{ display: 'none' }}
                                    onChange={(e) => addFiles(e.target.files)}
                                />
                            </div>

                            {files.length > 0 && (
                                <div className={styles.fileList}>
                                    {files.map((f, i) => (
                                        <div key={i} className={styles.fileItem}>
                                            <span className={styles.fileName}>{f.name}</span>
                                            <span className={styles.fileSize}>{formatSize(f.size)}</span>
                                            <button type="button" className={styles.fileRemove} onClick={() => removeFile(i)}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? <span className={styles.spinner} /> : '📨 Submit Grievance'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
