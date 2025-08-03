const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env
dotenv.config();

// DB Connect
connectDB();

// Init app
const app = express();
app.use(cors());
app.use(express.json());

const transferRoutes = require('./routes/transferRoutes');

app.get('/',(req,res)=>{
    res.send("landing page")
})

app.use('/transfer', transferRoutes);


// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/redirect', require('./routes/redirectRoutes'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
