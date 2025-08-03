const express = require('express');
const router = express.Router();
const { createProject, getAllProjects, updateProject } = require('../controllers/projectController');

router.post('/', createProject);
router.get('/', getAllProjects);
router.put('/:id', updateProject);

module.exports = router;
