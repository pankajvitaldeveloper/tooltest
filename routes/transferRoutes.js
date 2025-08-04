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
  const { encrypt, toid } = req.query;

  // Validate inputs
  if (!encrypt && !toid) {
    return res.status(400).send('Missing encrypt or toid parameter');
  }

  let uid, pid, fingerprint, projectName = '';
  try {
    // Attempt to decode encrypted payload
    if (encrypt) {
      const payload = JSON.parse(Buffer.from(encrypt, 'base64').toString());
      uid = payload.uid;
      pid = payload.pid;
      fingerprint = payload.fingerprint;
      if (pid) {
        const project = await Project.findOne({ pid });
        projectName = project ? project.name : '';
      }
    } else {
      uid = toid; // Fallback to toid if encrypt is missing
    }
  } catch (err) {
    console.error('Decrypt Error:', err);
    uid = toid || 'unknown';
  }

  // Get IP and user agent
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Fetch geolocation
  let location = {};
  try {
    const geo = await axios.get(`http://ip-api.com/json/${ip}`);
    location = geo.data || { error: 'Geo lookup failed' };
  } catch {
    location = { error: 'Geo lookup failed' };
  }

  // Log the final status
  try {
    await RedirectLog.create({
      uid,
      pid: pid || null,
      projectName,
      status,
      ip,
      userAgent,
      location,
      fingerprint: fingerprint || null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Redirect Log Error:', err);
  }

  // Respond with appropriate message
  const statusMsg = {
    completed: `✅ Survey completed! UID: ${uid}`,
    terminate: `❌ Survey terminated. UID: ${uid}`,
    quotafull: `🚫 Quota full. UID: ${uid}`,
  };

  res.send(statusMsg[status] || 'Invalid status');
}

router.get('/success', (req, res) => handleTransfer(req, res, 'completed'));
router.get('/terminate', (req, res) => handleTransfer(req, res, 'terminate'));
router.get('/quotafull', (req, res) => handleTransfer(req, res, 'quotafull'));

module.exports = router;