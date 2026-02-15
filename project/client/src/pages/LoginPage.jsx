import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Branding panel (visible on desktop) */}
                <div className={styles.branding}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>G</div>
                        <span className={styles.logoText}>UniGriev</span>
                    </div>
                    <h1 className={styles.brandTitle}>
                        Transparent Grievance
                        <br />
                        Redressal System
                    </h1>
                    <p className={styles.brandDesc}>
                        Submit, track, and resolve institutional grievances with full
                        transparency and accountability.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>📋</div>
                            <span>Digital grievance submission & tracking</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>⚡</div>
                            <span>Real-time status updates via live push</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>🔒</div>
                            <span>Secure, role-based access for all users</span>
                        </div>
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}>📊</div>
                            <span>Analytics & SLA-driven accountability</span>
                        </div>
                    </div>
                </div>

                {/* Login card */}
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Welcome Back</h2>
                    <p className={styles.cardSubtitle}>
                        Sign in to your UniGriev account
                    </p>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="login-email">
                                Email Address
                            </label>
                            <input
                                id="login-email"
                                className={styles.input}
                                type="email"
                                placeholder="you@institution.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="login-password">
                                Password
                            </label>
                            <div className={styles.passwordGroup}>
                                <input
                                    id="login-password"
                                    className={styles.input}
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
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
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? <span className={styles.spinner} /> : 'Sign In'}
                        </button>
                    </form>

                    <p className={styles.footerText}>
                        Don't have an account?{' '}
                        <Link to="/register" className={styles.footerLink}>
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
