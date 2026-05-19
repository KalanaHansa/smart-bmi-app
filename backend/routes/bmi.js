require('dotenv').config();
const express = require('express');
const router = express.Router();
const BmiRecord = require('../models/BmiRecord');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import middleware
const verifyToken = require('../middleware/auth');

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/calculate', verifyToken, async (req, res) => {
  try {
    const { weight, height } = req.body; 

    const userId = req.user.uid; 

    // 1. Calculate BMI (Weight in kg / Height in meters squared)
    const heightInMeters = height / 100;
    const bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));

    // Determine Status
    let status = 'Normal';
    if (bmi < 18.5) status = 'Underweight';
    else if (bmi >= 25 && bmi < 29.9) status = 'Overweight';
    else if (bmi >= 30) status = 'Obese';

    // 2. Generate AI Health Advice
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `A user has a BMI of ${bmi} (${status}). Provide 3 highly actionable, realistic health, nutrition, and exercise tips for them. Keep it concise, positive, and professional. Do not use markdown formatting like bolding. Add a short disclaimer that this is not medical advice.`;
    
    const result = await model.generateContent(prompt);
    const aiAdvice = result.response.text();

    // 3. Save to Database
    const newRecord = new BmiRecord({
      userId,
      weight,
      height,
      bmi,
      status,
      aiAdvice
    });
    
    await newRecord.save();
    res.status(201).json(newRecord);

  } catch (error) {
    console.error("Error processing BMI:", error);
    res.status(500).json({ error: 'Failed to process BMI data and generate advice' });
  }
});

router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const records = await BmiRecord.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;