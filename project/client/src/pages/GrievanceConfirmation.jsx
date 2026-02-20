import { useLocation, Link, Navigate } from 'react-router-dom';
import styles from './GrievanceConfirmation.module.css';

export default function GrievanceConfirmation() {
    const location = useLocation();
    const grievance = location.state?.grievance;

    if (!grievance) return <Navigate to="/submit-grievance" replace />;

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.icon}>✅</div>
                <h1 className={styles.title}>Grievance Submitted Successfully!</h1>
                <p className={styles.subtitle}>
                    Your complaint has been received and routed to the appropriate department.
                </p>

                <div className={styles.idBox}>
                    <div className={styles.idLabel}>Your Grievance ID</div>
                    <div className={styles.idValue}>{grievance.grievanceId}</div>
                </div>

                <div className={styles.details}>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Status</div>
                        <div className={styles.detailValue}>{grievance.status}</div>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Priority</div>
                        <div className={styles.detailValue}>{grievance.priority}</div>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Department</div>
                        <div className={styles.detailValue}>{grievance.assignedDepartment}</div>
                    </div>
                    <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>SLA Deadline</div>
                        <div className={styles.detailValue}>
                            {new Date(grievance.slaDeadline).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <Link to="/my-grievances" className={styles.primaryBtn}>
                        View My Grievances
                    </Link>
                    <Link to="/submit-grievance" className={styles.secondaryBtn}>
                        Submit Another
                    </Link>
                </div>
            </div>
        </div>
    );
}
