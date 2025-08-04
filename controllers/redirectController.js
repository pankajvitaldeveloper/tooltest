const { NotBeforeError } = require('jsonwebtoken');
const Project = require('../models/Project');
const RedirectLog = require('../models/RedirectLog');
const axios = require('axios');


exports.handleRedirect = async (req, res) => {
  const { code } = req.params; // encoded PID
  const { status, fingerprint, toid } = req.query;

  try {
    const pid = Buffer.from(code, 'base64').toString('utf-8');
    const project = await Project.findOne({ pid });
    if (!project) return res.status(404).send('Invalid PID');

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];

    let location = {};
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`);
      location = geo.data;
    } catch {
      location = { error: 'Geo lookup failed' };
    }

    await RedirectLog.create({
      uid: toid,
      pid,
      status: 'redirected',
      fingerprint,
      ip,
      userAgent,
      location
    });

    // Encrypt full payload (uid, pid, fingerprint) to be used *later* after survey
    const encrypted = Buffer.from(JSON.stringify({
      uid: toid,
      pid,
      fingerprint
    })).toString('base64');

    // Replace [UID] and append encrypted param to survey link
    const finalSurveyLink = project.surveyLink
      .replace('[UID]', toid)
      .concat(`&encrypt=${encrypted}`); // <-- optional: pass to survey so they can callback

    return res.redirect(finalSurveyLink);

  } catch (err) {
    console.error('Redirect error:', err);
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
