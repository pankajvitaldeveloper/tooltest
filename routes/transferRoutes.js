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
    console.error('Missing required parameters:', { encrypt, toid });
    return res.status(400).send('Missing encrypt or toid parameter');
  }

  let uid, pid, fingerprint, projectName = '';
  try {
    // Decode encrypted payload
    if (encrypt) {
      // Check if encrypt is a URL (common mistake)
      if (encrypt.startsWith('http')) {
        console.error('Invalid encrypt parameter: URL provided instead of base64', { encrypt });
        return res.status(400).send('Invalid encrypt parameter: Expected base64 string, received URL');
      }
      try {
        const payload = JSON.parse(Buffer.from(encrypt, 'base64').toString('utf-8'));
        uid = payload.uid;
        pid = payload.pid;
        fingerprint = payload.fingerprint || null;
        if (!uid) {
          console.error('Invalid payload: missing uid', { payload });
          return res.status(400).send('Invalid encrypt parameter: missing uid');
        }
      } catch (err) {
        console.error('Decrypt error:', { encrypt, error: err.message });
        return res.status(400).send('Invalid encrypt parameter: Failed to decode base64');
      }
    } else {
      uid = toid; // Fallback to toid if encrypt is missing
    }

    // Fetch project name if pid is available
    if (pid) {
      try {
        const project = await Project.findOne({ pid }).lean();
        projectName = project ? project.name : '';
      } catch (err) {
        console.error('Project lookup error:', { pid, error: err.message });
        // Continue without projectName
      }
    }

    // Get IP and user agent
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Fetch geolocation
    let location = {};
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 5000,
      });
      location = geo.data || { error: 'Geo lookup failed' };
    } catch (err) {
      console.error('Geolocation API error:', { ip, error: err.message });
      location = { error: 'Geo lookup failed', details: err.message };
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
      console.error('RedirectLog create error:', {
        uid,
        pid,
        status,
        error: err.message,
      });
      // Continue to respond
    }

    // Respond with appropriate message
    const statusMsg = {
      completed: `✅ Survey completed! UID: ${uid}`,
      terminate: `❌ Survey terminated. UID: ${uid}`,
      quotafull: `🚫 Quota full. UID: ${uid}`,
    };

    return res.send(statusMsg[status] || `Invalid status: ${status}`);
  } catch (err) {
    console.error('HandleTransfer error:', {
      encrypt,
      toid,
      status,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).send('Server error');
  }
}

router.get('/success', (req, res) => handleTransfer(req, res, 'completed'));
router.get('/terminate', (req, res) => handleTransfer(req, res, 'terminate'));
router.get('/quotafull', (req, res) => handleTransfer(req, res, 'quotafull'));

module.exports = router;