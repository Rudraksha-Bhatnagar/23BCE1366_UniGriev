import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './RegisterPage.module.css';

const ROLES = [
    { value: 'citizen', label: 'Citizen / Student' },
    { value: 'officer', label: 'Department Officer' },
    { value: 'deptAdmin', label: 'Department Admin' },
    { value: 'sysAdmin', label: 'System Admin' },
];

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobileNo: '',
        role: 'citizen',
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Invalid email format';
        if (!form.password) errs.password = 'Password is required';
        else if (form.password.length < 6) errs.password = 'Minimum 6 characters';
        if (form.password !== form.confirmPassword)
            errs.confirmPassword = 'Passwords do not match';
        if (!form.mobileNo.trim()) errs.mobileNo = 'Mobile number is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');

        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setLoading(true);
        try {
            await register({
                name: form.name,
                email: form.email,
                password: form.password,
                mobileNo: form.mobileNo,
                role: form.role,
            });
            navigate('/dashboard');
        } catch (err) {
            setServerError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Branding panel */}
                <div className={styles.branding}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>G</div>
                        <span className={styles.logoText}>UniGriev</span>
                    </div>
                    <h1 className={styles.brandTitle}>
                        Join the Grievance
                        <br />
                        Redressal Platform
                    </h1>
                    <p className={styles.brandDesc}>
                        Create your account to submit, track, and manage grievances with
                        complete transparency.
                    </p>
                </div>

                {/* Register card */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Create Account</h2>
                    <p className={styles.cardSubtitle}>
                        Fill in your details to get started
                    </p>

                    {serverError && (
                        <div className={styles.errorAlert}>{serverError}</div>
                    )}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="reg-name">
                                    Full Name
                                </label>
                                <input
                                    id="reg-name"
                                    className={styles.input}
                                    type="text"
                                    name="name"
                                    placeholder="John Doe"
                                    value={form.name}
                                    onChange={handleChange}
                                />
                                {errors.name && (
                                    <span className={styles.fieldError}>{errors.name}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="reg-mobile">
                                    Mobile Number
                                </label>
                                <input
                                    id="reg-mobile"
                                    className={styles.input}
                                    type="tel"
                                    name="mobileNo"
                                    placeholder="+91 9876543210"
                                    value={form.mobileNo}
                                    onChange={handleChange}
                                />
                                {errors.mobileNo && (
                                    <span className={styles.fieldError}>{errors.mobileNo}</span>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="reg-email">
                                Email Address
                            </label>
                            <input
                                id="reg-email"
                                className={styles.input}
                                type="email"
                                name="email"
                                placeholder="you@institution.edu"
                                value={form.email}
                                onChange={handleChange}
                            />
                            {errors.email && (
                                <span className={styles.fieldError}>{errors.email}</span>
                            )}
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="reg-password">
                                    Password
                                </label>
                                <div className={styles.passwordGroup}>
                                    <input
                                        id="reg-password"
                                        className={styles.input}
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Min. 6 characters"
                                        value={form.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className={styles.fieldError}>{errors.password}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label} htmlFor="reg-confirm">
                                    Confirm Password
                                </label>
                                <input
                                    id="reg-confirm"
                                    className={styles.input}
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Re-enter password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                />
                                {errors.confirmPassword && (
                                    <span className={styles.fieldError}>
                                        {errors.confirmPassword}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="reg-role">
                                Role
                            </label>
                            <select
                                id="reg-role"
                                className={styles.select}
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                            >
                                {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className={styles.spinner} />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Already have an account?{' '}
                        <Link to="/login" className={styles.footerLink}>
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
