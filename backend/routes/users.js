const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');

// Collection reference
const usersCollection = db.collection('users');

/**
 * @route   GET /api/users/profile/:uid
 * @desc    Get user profile data
 * @access  Private
 */
router.get('/profile/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Get user from Firebase Auth
    const userRecord = await auth.getUser(uid);
    
    // Get additional profile data from Firestore
    const userDoc = await usersCollection.doc(uid).get();
    
    let profileData = {};
    if (userDoc.exists) {
      profileData = userDoc.data();
    }
    
    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        ...profileData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/users/profile/:uid
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName, photoURL, ...additionalData } = req.body;
    
    // Update auth profile if displayName or photoURL provided
    if (displayName || photoURL) {
      const updateAuthData = {};
      if (displayName) updateAuthData.displayName = displayName;
      if (photoURL) updateAuthData.photoURL = photoURL;
      
      await auth.updateUser(uid, updateAuthData);
    }
    
    // Update additional profile data in Firestore
    const updateData = {
      ...additionalData,
      updatedAt: new Date().toISOString()
    };
    
    await usersCollection.doc(uid).set(updateData, { merge: true });
    
    // Get updated user data
    const userRecord = await auth.getUser(uid);
    const userDoc = await usersCollection.doc(uid).get();
    
    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        ...userDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/users/progress/:uid
 * @desc    Get user learning progress
 * @access  Private
 */
router.get('/progress/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Get user progress from Firestore
    const progressDoc = await usersCollection.doc(uid).collection('progress').doc('summary').get();
    
    if (!progressDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Progress data not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: progressDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/users/progress/:uid
 * @desc    Update user learning progress
 * @access  Private
 */
router.put('/progress/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const progressData = req.body;
    
    // Update progress data
    await usersCollection.doc(uid).collection('progress').doc('summary').set({
      ...progressData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Get updated progress data
    const updatedDoc = await usersCollection.doc(uid).collection('progress').doc('summary').get();
    
    res.status(200).json({
      success: true,
      data: updatedDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
