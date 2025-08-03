const express = require('express');
const router = express.Router();
const RedirectLog = require('../models/RedirectLog'); // Adjust path if needed

async function logRedirect(req, status) {
  try {
    await RedirectLog.create({
      uid: req.query.uid,
      pid: req.query.pid,
      status,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      location: req.location, // You need to set this in middleware if you want geoIP
      fingerprint: req.query.fingerprint, // If sent from client
    });
  } catch (err) {
    console.error('Redirect log error:', err);
  }
}


router.get('/success', async (req, res) => {
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
  req.query.uid = uid;
  req.query.pid = pid;
  req.query.fingerprint = fingerprint;

  // Find project name by pid
  let projectName = '';
  if (pid) {
    const project = await Project.findOne({ pid });
    if (project) projectName = project.name;
  }
  req.query.projectName = projectName;

  // Log with projectName
  try {
    await RedirectLog.create({
      uid,
      pid,
      projectName,
      status: 'completed',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      location: req.location,
      fingerprint
    });
  } catch (err) {
    console.error('Redirect log error:', err);
  }

  res.send(`✅ Survey completed! UID: ${uid}`);
});


router.get('/terminate', async (req, res) => {
  await logRedirect(req, 'terminate');
  const { encrypt } = req.query;
  res.send(`❌ Survey terminated. Encrypted ID: ${encrypt}`);
});

router.get('/quotafull', async (req, res) => {
  await logRedirect(req, 'quotafull');
  const { encrypt } = req.query;
  res.send(`🚫 Quota full. Encrypted ID: ${encrypt}`);
});

module.exports = router;