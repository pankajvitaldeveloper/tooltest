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







// const crypto = require('crypto');

// // Helper to encrypt UID
// const encryptUID = (uid) => {
//   const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPT_SECRET || 'mysecret');
//   let encrypted = cipher.update(uid, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   return encrypted;
// };

// exports.handleRedirect = async (req, res) => {
//   const { code } = req.params; // encoded PID
//   const { status, fingerprint, toid } = req.query;

//   try {
//     const pid = Buffer.from(code, 'base64').toString('utf-8');
//     const project = await Project.findOne({ pid });
//     if (!project) return res.status(404).send('Invalid PID');

//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
//     const userAgent = req.headers['user-agent'];

//     let location = {};
//     try {
//       const geo = await axios.get(`http://ip-api.com/json/${ip}`);
//       location = geo.data;
//     } catch {
//       location = { error: 'Geo lookup failed' };
//     }

//     await RedirectLog.create({
//       uid: toid,
//       pid,
//       status,
//       fingerprint,
//       ip,
//       userAgent,
//       location
//     });

//     const encrypted = encryptUID(toid);

//     // Redirect to internal tool transfer endpoint based on status
//     if (status === 'completed') {
//       return res.redirect(`https://tooltest.onrender.com/transfer/success?encrypt=${encrypted}`);
//     } else if (status === 'terminate') {
//       return res.redirect(`https://tooltest.onrender.com/transfer/terminate?encrypt=${encrypted}`);
//     } else if (status === 'quotafull') {
//       return res.redirect(`https://tooltest.onrender.com/transfer/quotafull?encrypt=${encrypted}`);
//     } else {
//       // Default: still send to survey link with UID replaced
//       const finalSurveyLink = project.surveyLink.replace('[UID]', toid);
//       return res.redirect(finalSurveyLink);
//     }

//   } catch (err) {
//     res.status(500).send('Server error');
//   }
// };
