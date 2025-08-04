const Project = require('../models/Project');
// const crypto = require('crypto');


exports.createProject = async (req, res) => {
  try {
    const { name, pid, clientName, surveyLink, description } = req.body;

    if (!pid || !surveyLink) {
      return res.status(400).json({ message: 'PID and surveyLink are required' });
    }

    const newProject = new Project({
      name,
      pid,
      clientName,
      surveyLink,
      description
    });

    await newProject.save();

    // Encode the PID to base64 to generate a unique redirect URL
    const encodedPID = Buffer.from(pid).toString('base64');
    const generatedRedirect = `https://tooltest.onrender.com/redirect/${encodedPID}?toid=[TOID]`;

    res.status(201).json({
      message: 'Project created successfully',
      project: newProject,
      generatedRedirect
    });
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};



// Get all projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};


exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.status(200).json({ message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};


const crypto = require('crypto');

// Helper to encrypt UID
const encryptUID = (uid) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPT_SECRET || 'mysecret');
  let encrypted = cipher.update(uid, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

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
      status,
      fingerprint,
      ip,
      userAgent,
      location
    });

    const encrypted = encryptUID(toid);

    // Redirect to internal tool transfer endpoint based on status
    if (status === 'completed') {
      return res.redirect(`https://tooltest.onrender.com/transfer/success?encrypt=${encrypted}`);
    } else if (status === 'terminate') {
      return res.redirect(`https://tooltest.onrender.com/transfer/terminate?encrypt=${encrypted}`);
    } else if (status === 'quotafull') {
      return res.redirect(`https://tooltest.onrender.com/transfer/quotafull?encrypt=${encrypted}`);
    } else {
      // Default: still send to survey link with UID replaced
      const finalSurveyLink = project.surveyLink.replace('[UID]', toid);
      return res.redirect(finalSurveyLink);
    }

  } catch (err) {
    res.status(500).send('Server error');
  }
};
