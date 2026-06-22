const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Collection references
const messagesCollection = db.collection('tutorMessages');
const subjectsCollection = db.collection('subjects');

/**
 * @route   GET /api/tutor/subjects
 * @desc    Get all subjects and topics
 * @access  Public
 */
router.get('/subjects', async (req, res) => {
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
 * @route   GET /api/tutor/messages/:userId
 * @desc    Get conversation history for a user
 * @access  Private
 */
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { subject, topic, limit } = req.query;
    
    let query = messagesCollection.where('userId', '==', userId);
    
    // Apply filters if provided
    if (subject) {
      query = query.where('subject', '==', subject);
    }
    
    if (topic) {
      query = query.where('topic', '==', topic);
    }
    
    // Order by timestamp
    query = query.orderBy('timestamp', 'asc');
    
    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const snapshot = await query.get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/tutor/messages
 * @desc    Send a new message to the AI tutor
 * @access  Private
 */
router.post('/messages', async (req, res) => {
  try {
    const {
      userId,
      content,
      subject,
      topic
    } = req.body;
    
    // Validate required fields
    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Please provide userId and message content'
      });
    }
    
    // Create user message
    const userMessage = {
      userId,
      content,
      subject: subject || null,
      topic: topic || null,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Add user message to database
    const userMessageRef = await messagesCollection.add(userMessage);
    
    // TODO: In a real implementation, this would call an AI service
    // For now, we'll just create a mock AI response
    const aiResponse = {
      userId,
      content: `This is a mock AI response to: "${content}"`,
      subject: subject || null,
      topic: topic || null,
      sender: 'ai',
      timestamp: new Date().toISOString(),
      referencedMessageId: userMessageRef.id
    };
    
    // Add AI response to database
    const aiMessageRef = await messagesCollection.add(aiResponse);
    
    res.status(201).json({
      success: true,
      data: {
        userMessage: {
          id: userMessageRef.id,
          ...userMessage
        },
        aiMessage: {
          id: aiMessageRef.id,
          ...aiResponse
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
