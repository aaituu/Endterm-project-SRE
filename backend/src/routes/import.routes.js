const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');
const controller = require('../controllers/importController');

const router = express.Router();

const importDir = path.join(__dirname, '../../resources/imports');
if (!fs.existsSync(importDir)) fs.mkdirSync(importDir, { recursive: true });

const upload = multer({
  dest: importDir,
  limits: { fileSize: parseInt(process.env.MAX_IMPORT_FILE_SIZE, 10) || 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx') return cb(null, true);
    return cb(new Error('Тек .xlsx Excel файлдары қабылданады'));
  }
});

const requireImportSchoolContext = async (req, res, next) => {
  if (!req.school_id) {
    return res.status(403).json({ success: false, message: 'Импорт үшін мектеп контексті қажет' });
  }
  return next();
};

const tenantImport = [attachSchoolContext, asyncHandler(requireImportSchoolContext)];

router.use(authenticate, requireAdmin);

router.get('/categories', asyncHandler(controller.getCategories));
router.get('/templates/:category', asyncHandler(controller.downloadTemplate));
router.post('/upload', upload.single('file'), ...tenantImport, asyncHandler(controller.upload));
router.post('/validate', ...tenantImport, asyncHandler(controller.validate));
router.post('/confirm', ...tenantImport, asyncHandler(controller.confirm));
router.get('/history', ...tenantImport, asyncHandler(controller.history));
router.get('/:id', ...tenantImport, asyncHandler(controller.details));

module.exports = router;
