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

    const encodedPID = Buffer.from(pid).toString('base64');
    const generatedRedirect = `https://tooltest.onrender.com/redirect/${encodedPID}?toid=[TOID]`;

    // Prepare payload for encrypt param
    const payload = { pid, clientName }; // You can add more fields if needed
    const encrypt = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate all 3 redirect URLs
    const base = 'https://tooltest.onrender.com/transfer';
    const successRedirect = `${base}/success?encrypt=${encrypt}`;
    const terminateRedirect = `${base}/terminate?encrypt=${encrypt}`;
    const quotafullRedirect = `${base}/quotafull?encrypt=${encrypt}`;

    res.status(201).json({
      message: 'Project created successfully',
      project: newProject,
      successRedirect,
      terminateRedirect,
      quotafullRedirect,
      generatedRedirect
    });
  } catch (err) {
    console.error('Create Project Error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

// belwo code was working create
// exports.createProject = async (req, res) => {
//   try {
//     const { name, pid, clientName, surveyLink, description } = req.body;

//     if (!pid || !surveyLink) {
//       return res.status(400).json({ message: 'PID and surveyLink are required' });
//     }

//     const newProject = new Project({
//       name,
//       pid,
//       clientName,
//       surveyLink,
//       description
//     });

//     await newProject.save();

//     // Encode the PID to base64 to generate a unique redirect URL
//     const encodedPID = Buffer.from(pid).toString('base64');
//     const generatedRedirect = `https://tooltest.onrender.com/redirect/${encodedPID}?toid=[TOID]`;

//     res.status(201).json({
//       message: 'Project created successfully',
//       project: newProject,
//       generatedRedirect
//     });
//   } catch (err) {
//     console.error('Create Project Error:', err);
//     res.status(500).json({ message: 'Server Error', error: err.message });
//   }
// };



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
