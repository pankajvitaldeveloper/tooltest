const express = require('express');
const router = express.Router();
const RedirectLog = require('../models/RedirectLog');
const Project = require('../models/Project');
const axios = require('axios'); // Needed for geo lookup

// Helper to encrypt UID
const crypto = require('crypto');
const encryptUID = (uid) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPT_SECRET || 'mysecret');
  let encrypted = cipher.update(uid, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

/**
 * Shared handler for /success, /terminate, /quotafull
 * Decodes encrypt param, logs redirect, returns status message
 */
async function handleTransfer(req, res, status) {
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

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
  const userAgent = req.headers['user-agent'];

  let location = {};
  try {
    const geo = await axios.get(`http://ip-api.com/json/${ip}`);
    location = geo.data;
  } catch {
    location = { error: 'Geo lookup failed' };
  }

  try {
    await RedirectLog.create({
      uid,
      pid,
      projectName,
      status,
      ip,
      userAgent,
      location,
      fingerprint
    });
  } catch (err) {
    console.error('Redirect log error:', err);
  }

  const statusMsg = {
    completed: `✅ Survey completed! UID: ${uid}`,
    terminate: `❌ Survey terminated. UID: ${uid}`,
    quotafull: `🚫 Quota full. UID: ${uid}`
  };

  res.send(statusMsg[status]);
}


// Routes for all three statuses
router.get('/success', (req, res) => handleTransfer(req, res, 'completed'));
router.get('/terminate', (req, res) => handleTransfer(req, res, 'terminate'));
router.get('/quotafull', (req, res) => handleTransfer(req, res, 'quotafull'));

module.exports = router;