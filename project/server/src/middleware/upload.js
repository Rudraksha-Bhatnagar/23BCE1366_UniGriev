const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // <timestamp>-<random>-<originalname>
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

// File filter — allowed extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type '${ext}' is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5, // max 5 files per request
    },
});

module.exports = upload;
