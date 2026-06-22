const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Collection reference
const topicsCollection = db.collection('topics');
const subjectsCollection = db.collection('subjects');

/**
 * @route   GET /api/topics
 * @desc    Get all topics with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { subject, gradeLevel, difficulty } = req.query;
    let query = topicsCollection;
    
    // Apply filters if provided
    if (subject) {
      query = query.where('subject', '==', subject);
    }
    
    if (gradeLevel) {
      query = query.where('gradeLevel', '==', gradeLevel);
    }
    
    if (difficulty) {
      query = query.where('difficulty', '==', difficulty);
    }
    
    const snapshot = await query.get();
    
    const topics = [];
    snapshot.forEach(doc => {
      topics.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      count: topics.length,
      data: topics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/topics/:id
 * @desc    Get single topic by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await topicsCollection.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
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
 * @route   POST /api/topics
 * @desc    Create a new topic
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      subject,
      gradeLevel,
      difficulty,
      learningObjectives,
      relatedTopics
    } = req.body;
    
    // Validate required fields
    if (!name || !description || !subject || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, description, subject, and grade level'
      });
    }
    
    // Check if subject exists
    const subjectSnapshot = await subjectsCollection
      .where('name', '==', subject)
      .get();
    
    if (subjectSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Subject does not exist'
      });
    }
    
    // Check if topic with same name already exists for this subject
    const existingTopics = await topicsCollection
      .where('name', '==', name)
      .where('subject', '==', subject)
      .get();
    
    if (!existingTopics.empty) {
      return res.status(400).json({
        success: false,
        error: 'A topic with this name already exists for this subject'
      });
    }
    
    // Process learning objectives if provided
    let processedObjectives = [];
    if (learningObjectives && learningObjectives.trim()) {
      processedObjectives = learningObjectives
        .split('\n')
        .map(obj => obj.trim())
        .filter(obj => obj.length > 0);
    }
    
    // Create topic document
    const topicData = {
      name,
      description,
      subject,
      gradeLevel,
      difficulty: difficulty || 'medium',
      learningObjectives: processedObjectives,
      relatedTopics: relatedTopics || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await topicsCollection.add(topicData);
    
    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...topicData
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
 * @route   PUT /api/topics/:id
 * @desc    Update a topic
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Check if topic exists
    const doc = await topicsCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }
    
    // If subject is being changed, check if it exists
    if (updateData.subject && updateData.subject !== doc.data().subject) {
      const subjectSnapshot = await subjectsCollection
        .where('name', '==', updateData.subject)
        .get();
      
      if (subjectSnapshot.empty) {
        return res.status(400).json({
          success: false,
          error: 'Subject does not exist'
        });
      }
    }
    
    // If name is being updated, check if it conflicts with another topic
    if (updateData.name && updateData.name !== doc.data().name) {
      const subject = updateData.subject || doc.data().subject;
      const existingTopics = await topicsCollection
        .where('name', '==', updateData.name)
        .where('subject', '==', subject)
        .get();
      
      let hasConflict = false;
      existingTopics.forEach(doc => {
        if (doc.id !== id) {
          hasConflict = true;
        }
      });
      
      if (hasConflict) {
        return res.status(400).json({
          success: false,
          error: 'A topic with this name already exists for this subject'
        });
      }
    }
    
    // Process learning objectives if provided
    if (updateData.learningObjectives && typeof updateData.learningObjectives === 'string') {
      updateData.learningObjectives = updateData.learningObjectives
        .split('\n')
        .map(obj => obj.trim())
        .filter(obj => obj.length > 0);
    }
    
    // Update topic
    await topicsCollection.doc(id).update(updateData);
    
    res.status(200).json({
      success: true,
      data: {
        id,
        ...doc.data(),
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
 * @route   DELETE /api/topics/:id
 * @desc    Delete a topic
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if topic exists
    const doc = await topicsCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }
    
    // Check if there are resources associated with this topic
    // This would require a resources collection with a topics field
    // Implement this check if needed
    
    // Delete topic
    await topicsCollection.doc(id).delete();
    
    // Update related topics references in other topics
    const topicName = doc.data().name;
    const relatedTopicsSnapshot = await topicsCollection
      .where('relatedTopics', 'array-contains', topicName)
      .get();
    
    const batch = db.batch();
    relatedTopicsSnapshot.forEach(relatedDoc => {
      const relatedTopics = relatedDoc.data().relatedTopics.filter(
        topic => topic !== topicName
      );
      batch.update(relatedDoc.ref, { relatedTopics });
    });
    
    await batch.commit();
    
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
