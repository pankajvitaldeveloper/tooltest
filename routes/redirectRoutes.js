const express = require('express');
const router = express.Router();
const { handleRedirect } = require('../controllers/redirectController');

// router.get('/:uid/:pid', handleRedirect);
router.get('/:code', handleRedirect); //new


module.exports = router;
