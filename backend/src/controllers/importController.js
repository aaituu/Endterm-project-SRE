const importService = require('../services/importService');

const getCategories = async (req, res) => {
  res.json({ success: true, data: importService.listCategories() });
};

const downloadTemplate = async (req, res) => {
  const buffer = await importService.templateBuffer(req.params.category);
  const filename = `user-import-${req.params.category}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
};

const upload = async (req, res) => {
  const result = await importService.createBatchFromUpload({
    file: req.file,
    category: req.body.category,
    schoolId: req.school_id,
    userId: req.user.id,
    options: {
      update_existing: req.body.update_existing,
      create_missing_classes: req.body.create_missing_classes
    }
  });
  res.status(201).json({ success: true, data: result });
};

const validate = async (req, res) => {
  const result = await importService.validateBatch({
    batchId: req.body.batch_id,
    schoolId: req.school_id,
    options: req.body.options || req.body
  });
  res.json({ success: true, data: result });
};

const confirm = async (req, res) => {
  const result = await importService.confirmBatch({
    batchId: req.body.batch_id,
    schoolId: req.school_id,
    userId: req.user.id,
    options: req.body.options || req.body
  });
  res.json({ success: true, data: result });
};

const history = async (req, res) => {
  const result = await importService.history({
    schoolId: req.school_id,
    page: req.query.page,
    limit: req.query.limit
  });
  res.json({ success: true, ...result });
};

const details = async (req, res) => {
  const result = await importService.details({
    batchId: req.params.id,
    schoolId: req.school_id
  });
  res.json({ success: true, data: result });
};

module.exports = {
  confirm,
  details,
  downloadTemplate,
  getCategories,
  history,
  upload,
  validate
};
