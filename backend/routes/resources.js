const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// Collection reference
const resourcesCollection = db.collection('resources');

/**
 * @route   GET /api/resources
 * @desc    Get all resources
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, featured, limit } = req.query;
    let query = resourcesCollection;
    
    // Apply filters if provided
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    
    if (featured === 'true') {
      query = query.where('featured', '==', true);
    }
    
    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const snapshot = await query.get();
    
    const resources = [];
    snapshot.forEach(doc => {
      resources.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/resources/:id
 * @desc    Get single resource by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await resourcesCollection.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
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
 * @route   POST /api/resources
 * @desc    Create a new resource
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subject,
      gradeLevel,
      format,
      imageUrl,
      contentUrl,
      featured,
      tags,
      fileType,
      fileSize,
      fileName
    } = req.body;
    
    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Please provide title, description, and category'
      });
    }
    
    // Create resource document
    const resourceData = {
      title,
      description,
      category,
      subject: subject || null,
      gradeLevel: gradeLevel || null,
      format: format || null,
      imageUrl: imageUrl || null,
      contentUrl: contentUrl || null,
      featured: featured || false,
      tags: tags || [],
      // File metadata
      fileType: fileType || null,
      fileSize: fileSize || 0,
      fileName: fileName || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await resourcesCollection.add(resourceData);
    
    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...resourceData
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
 * @route   PUT /api/resources/:id
 * @desc    Update a resource
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    // Check if resource exists
    const doc = await resourcesCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    // Update resource
    await resourcesCollection.doc(id).update(updateData);
    
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
 * @route   DELETE /api/resources/:id
 * @desc    Delete a resource and its associated file from Firebase Storage
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if resource exists
    const doc = await resourcesCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }
    
    const resourceData = doc.data();
    
    // If there's a file associated with this resource, delete it from Firebase Storage
    if (resourceData.contentUrl && resourceData.fileName) {
      try {
        // Get Firebase Admin from the app
        const admin = require('firebase-admin');
        const bucket = admin.storage().bucket();
        
        // Extract the file path from the contentUrl
        // Assuming contentUrl format is like: https://storage.googleapis.com/bucket-name/path/to/file
        const urlPath = new URL(resourceData.contentUrl).pathname;
        const filePath = urlPath.split('/').slice(2).join('/');
        
        // Delete the file from Firebase Storage
        await bucket.file(filePath).delete();
        console.log(`Deleted file: ${filePath} from Firebase Storage`);
        
        // If there's a thumbnail image and it's different from the content URL, delete it too
        if (resourceData.imageUrl && resourceData.imageUrl !== resourceData.contentUrl) {
          const imageUrlPath = new URL(resourceData.imageUrl).pathname;
          const imagePath = imageUrlPath.split('/').slice(2).join('/');
          
          await bucket.file(imagePath).delete();
          console.log(`Deleted thumbnail: ${imagePath} from Firebase Storage`);
        }
      } catch (storageError) {
        // Log the error but continue with deleting the resource document
        console.error('Error deleting file from storage:', storageError);
      }
    }
    
    // Delete resource document from Firestore
    await resourcesCollection.doc(id).delete();
    
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
