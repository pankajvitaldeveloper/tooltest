const express = require('express');
const router = express.Router();
const RedirectLog = require('../models/RedirectLog'); 
const Project = require('../models/Project'); 

async function handleRedirect(req, res, status) {
  let uid, pid, fingerprint;
  if (!req.query.encrypt) {
    return res.status(400).send('Missing encrypt parameter');
  }
  try {
    const payload = JSON.parse(Buffer.from(req.query.encrypt, 'base64').toString());
    uid = payload.uid;
    pid = payload.pid;
    fingerprint = payload.fingerprint;
  } catch (e) {
    uid = req.query.encrypt;
    pid = undefined;
    fingerprint = undefined;
  }
  let projectName = '';
  if (pid) {
    const project = await Project.findOne({ pid });
    if (project) projectName = project.name;
  }
  try {
    await RedirectLog.create({
      uid,
      pid,
      projectName,
      status,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      location: req.location,
      fingerprint
    });
  } catch (err) {
    console.error('Redirect log error:', err);
  }
  let statusMsg = {
    completed: `✅ Survey completed! UID: ${uid}`,
    terminate: `❌ Survey terminated. UID: ${uid}`,
    quotafull: `🚫 Quota full. UID: ${uid}`
  };
  res.send(statusMsg[status]);
}

router.get('/success', (req, res) => handleRedirect(req, res, 'completed'));
router.get('/terminate', (req, res) => handleRedirect(req, res, 'terminate'));
router.get('/quotafull', (req, res) => handleRedirect(req, res, 'quotafull'));

module.exports = router;