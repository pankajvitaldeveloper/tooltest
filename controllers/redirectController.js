const { NotBeforeError } = require('jsonwebtoken');
const Project = require('../models/Project');
const RedirectLog = require('../models/RedirectLog');
const axios = require('axios');


exports.handleRedirect = async (req, res) => {
  const { code } = req.params; // Encoded PID
  const { status = 'redirected', fingerprint, toid } = req.query;

  // Validate inputs
  if (!code || !toid) {
    return res.status(400).send('Missing code or toid parameter');
  }

  try {
    // Decode PID
    const pid = Buffer.from(code, 'base64').toString('utf-8');
    const project = await Project.findOne({ pid });
    if (!project) {
      return res.status(404).send('Invalid PID');
    }

    // Get IP and user agent
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Fetch geolocation
    let location = {};
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`);
      location = geo.data || { error: 'Geo lookup failed' };
    } catch {
      location = { error: 'Geo lookup failed' };
    }

    // Log the redirect
    await RedirectLog.create({
      uid: toid,
      pid,
      projectName: project.name,
      status: status || 'redirected',
      fingerprint: fingerprint || null,
      ip,
      userAgent,
      location,
      createdAt: new Date(),
    });

    // Encrypt payload for survey callback
    const payload = JSON.stringify({ uid: toid, pid, fingerprint: fingerprint || null });
    const encrypted = Buffer.from(payload).toString('base64');

    // Construct final survey link
    const finalSurveyLink = project.surveyLink
      .replace('[UID]', toid)
      .concat(`&encrypt=${encrypted}`);

    return res.redirect(finalSurveyLink);
  } catch (err) {
    console.error('Redirect Error:', err);
    res.status(500).send('Server error');
  }
};


// exports.handleRedirect = async (req, res) => {
//   const { code } = req.params;
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

//     // THIS IS CRITICAL: replace [UID] with actual TOID
//     const finalSurveyLink = project.surveyLink.replace('[UID]', toid);

//     // 🔥 LOG FOR DEBUGGING
//     // console.log('Redirecting to:', finalSurveyLink);

//     return res.redirect(finalSurveyLink);
//   } catch (err) {
//     console.error('Redirect error:', err);
//     res.status(500).send('Server error');
//   }
// };

// Clean version of your updated code
// exports.handleRedirect = async (req, res) => {
//   const { code } = req.params; // encoded PID
//   const { fingerprint, toid } = req.query;

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
//       status: 'fail', // or 'incoming', 'start' etc.
//       fingerprint,
//       ip,
//       userAgent,
//       location
//     });

//     // redirect to the survey
//     const finalSurveyLink = project.surveyLink.replace('[UID]', toid);
//     return res.redirect(finalSurveyLink);

//   } catch (err) {
//     console.error('Redirect error:', err);
//     res.status(500).send('Server error');
//   }
// };
// //working NotBefore
