const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const socketModule = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

const startServer = async () => {
    await connectDB();

    const server = http.createServer(app);
    socketModule.init(server);

    const { start: startSlaChecker } = require('./jobs/slaChecker');
    startSlaChecker();

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n[ERROR] Port ${PORT} is already in use.`);
            console.error(`Run "npx kill-port ${PORT}" in project/server/ to free it, then restart.\n`);
            process.exit(1);
        } else {
            throw err;
        }
    });

    server.listen(PORT, () => {
        console.log(`UniGriev server running on http://localhost:${PORT}`);
        console.log('Socket.io initialized');
    });
};

startServer();
