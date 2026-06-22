const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Collection reference
const subjectsCollection = db.collection('subjects');

/**
 * @route   GET /api/subjects
 * @desc    Get all subjects
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const snapshot = await subjectsCollection.get();
    
    const subjects = [];
    snapshot.forEach(doc => {
      subjects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/subjects/:id
 * @desc    Get single subject by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await subjectsCollection.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
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
 * @route   POST /api/subjects
 * @desc    Create a new subject
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      iconUrl,
      gradeLevels,
      color
    } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name and description'
      });
    }
    
    // Check if subject with same name already exists
    const existingSubjects = await subjectsCollection.where('name', '==', name).get();
    if (!existingSubjects.empty) {
      return res.status(400).json({
        success: false,
        error: 'A subject with this name already exists'
      });
    }
    
    // Create subject document
    const subjectData = {
      name,
      description,
      iconUrl: iconUrl || null,
      gradeLevels: gradeLevels || [],
      color: color || '#3B82F6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await subjectsCollection.add(subjectData);
    
    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...subjectData
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
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Check if subject exists
    const doc = await subjectsCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }
    
    // If name is being updated, check if it conflicts with another subject
    if (updateData.name && updateData.name !== doc.data().name) {
      const existingSubjects = await subjectsCollection
        .where('name', '==', updateData.name)
        .get();
      
      if (!existingSubjects.empty) {
        return res.status(400).json({
          success: false,
          error: 'A subject with this name already exists'
        });
      }
    }
    
    // Update subject
    await subjectsCollection.doc(id).update(updateData);
    
    res.status(200).json({
      success: true,
      data: {
        id,
        ...updateData
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
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if subject exists
    const doc = await subjectsCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }
    
    // Check if there are topics associated with this subject
    const topicsCollection = db.collection('topics');
    const topicsSnapshot = await topicsCollection
      .where('subject', '==', doc.data().name)
      .limit(1)
      .get();
    
    if (!topicsSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete subject with associated topics. Remove the topics first.'
      });
    }
    
    // Delete subject
    await subjectsCollection.doc(id).delete();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
