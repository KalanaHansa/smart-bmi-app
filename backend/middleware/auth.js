const admin = require('firebase-admin');

// Load your secret service account key
const serviceAccount = require('../firebase-service-account.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyToken = async (req, res, next) => {
  // 1. Check if the Authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // 2. Extract the token (Remove "Bearer " from the string)
  const token = authHeader.split('Bearer ')[1];

  try {
    // 3. Ask Firebase to verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 4. Attach the user's data (like their uid) to the request object
    req.user = decodedToken;
    
    // 5. Move on to the next function (the BMI calculator)
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};

module.exports = verifyToken;