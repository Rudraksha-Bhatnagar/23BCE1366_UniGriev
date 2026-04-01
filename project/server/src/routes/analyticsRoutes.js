const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getOverview, getByStatus, getTrends, exportCSV } = require('../controllers/analyticsController');

router.use(protect);
router.use(authorizeRoles('deptAdmin', 'sysAdmin'));

router.get('/overview', getOverview);
router.get('/by-status', getByStatus);
router.get('/trends', getTrends);
router.get('/export-csv', exportCSV);

module.exports = router;
