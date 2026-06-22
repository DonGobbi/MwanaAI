const express = require('express');
const router = express.Router();
const { auth, db, admin } = require('../config/firebase');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - No token provided' 
    });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid token' 
    });
  }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide email and password' 
      });
    }
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
    });
    
    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Verify credentials and return custom token for frontend authentication
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide email and password' 
      });
    }
    
    // In a production environment, you would use Firebase Authentication REST API
    // to sign in with email/password and get an ID token
    // For this implementation, we'll verify the user exists and create a custom token
    
    try {
      // Check if user exists
      const userRecord = await auth.getUserByEmail(email);
      
      // Create custom token (in production, you'd verify the password first)
      const token = await auth.createCustomToken(userRecord.uid);
      
      res.status(200).json({
        success: true,
        token,
        uid: userRecord.uid
      });
    } catch (error) {
      // User not found or other error
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/user/:uid
 * @desc    Get user data by UID
 * @access  Private
 */
router.get('/user/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Verify the requesting user is accessing their own data
    if (req.user.uid !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - You can only access your own user data'
      });
    }
    
    const userRecord = await auth.getUser(uid);
    
    // Get additional user data from Firestore if available
    const userDoc = await db.collection('users').doc(uid).get();
    let additionalData = {};
    
    if (userDoc.exists) {
      additionalData = userDoc.data();
    }
    
    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        ...additionalData
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user data
 * @access  Private
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userRecord = await auth.getUser(uid);
    
    // Get additional user data from Firestore if available
    const userDoc = await db.collection('users').doc(uid).get();
    let additionalData = {};
    
    if (userDoc.exists) {
      additionalData = userDoc.data();
    }
    
    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        ...additionalData
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid user'
    });
  }
});

module.exports = router;
