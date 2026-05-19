require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bmiRoutes = require('./routes/bmi');
const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/bmi', bmiRoutes);

// To test the server
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