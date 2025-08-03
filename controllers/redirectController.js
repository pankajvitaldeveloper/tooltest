const Project = require('../models/Project');
const RedirectLog = require('../models/RedirectLog');
const axios = require('axios');

exports.handleRedirect = async (req, res) => {
  const { code } = req.params;
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
      status,
      fingerprint,
      ip,
      userAgent,
      location
    });

    // THIS IS CRITICAL: replace [UID] with actual TOID
    const finalSurveyLink = project.surveyLink.replace('[UID]', toid);

    // 🔥 LOG FOR DEBUGGING
    // console.log('Redirecting to:', finalSurveyLink);

    return res.redirect(finalSurveyLink);
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).send('Server error');
  }
};
