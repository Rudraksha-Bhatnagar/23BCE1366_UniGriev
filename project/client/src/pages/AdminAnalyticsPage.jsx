import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import styles from './AdminAnalyticsPage.module.css';

const STATUS_COLORS = {
    Submitted: '#38BDF8',
    'In Review': '#0D9488',
    'In Progress': '#0D9488',
    'Awaiting Info': '#F59E0B',
    Resolved: '#10B981',
    Closed: '#64748B',
    Escalated: '#F43F5E',
};

export default function AdminAnalyticsPage() {
    const [overview, setOverview] = useState(null);
    const [byStatus, setByStatus] = useState([]);
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [csvLoading, setCsvLoading] = useState(false);

    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [ovRes, statusRes, trendRes] = await Promise.all([
                    fetch('/api/analytics/overview', { headers }),
                    fetch('/api/analytics/by-status', { headers }),
                    fetch('/api/analytics/trends', { headers }),
                ]);

                const [ovData, statusData, trendData] = await Promise.all([
                    ovRes.json(),
                    statusRes.json(),
                    trendRes.json(),
                ]);

                setOverview(ovData);
                setByStatus(statusData.data || []);
                setTrends(trendData.data || []);
            } catch (err) {
                console.error('Analytics fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const handleExportCSV = async () => {
        setCsvLoading(true);
        try {
            const res = await fetch('/api/analytics/export-csv', { headers });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'grievances-export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('CSV export failed: ' + err.message);
        } finally {
            setCsvLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <Sidebar />
                <div className={styles.content}>
                    <div className={styles.loading}>Loading analytics...</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Sidebar />
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Analytics</h1>
                    <button
                        className={styles.exportBtn}
                        onClick={handleExportCSV}
                        disabled={csvLoading}
                    >
                        {csvLoading ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>

                {/* Overview Cards */}
                {overview && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.iconBlue}`}>T</div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Total</span>
                                <span className={styles.statValue}>{overview.total}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.iconAmber}`}>P</div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Pending</span>
                                <span className={styles.statValue}>{overview.pending}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.iconGreen}`}>R</div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Resolved</span>
                                <span className={styles.statValue}>{overview.resolved}</span>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIcon} ${styles.iconRose}`}>E</div>
                            <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Escalated</span>
                                <span className={styles.statValue}>{overview.escalated}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grievances by Status */}
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Grievances by Status</h3>
                    {byStatus.length === 0 ? (
                        <p className={styles.noData}>No data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={byStatus} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {byStatus.map((entry) => (
                                        <Cell
                                            key={entry.status}
                                            fill={STATUS_COLORS[entry.status] || '#3B3F8C'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Monthly Trends */}
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Monthly Trends (Last 6 Months)</h3>
                    {trends.length === 0 ? (
                        <p className={styles.noData}>No data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={trends} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="Grievances"
                                    stroke="#3B3F8C"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#3B3F8C' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
