require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors()); // Allows your React app to send requests here
app.use(express.json()); // Allows your app to parse JSON data

// Import Routes
const bmiRoutes = require('./routes/bmi');

// Use Routes
app.use('/api/bmi', bmiRoutes); // All routes in bmi.js will start with /api/bmi

// Basic Route to test the server
app.get('/', (req, res) => {
  res.send('Smart BMI Backend is running!');
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});