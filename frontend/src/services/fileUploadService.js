import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage
 * 
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g., 'resources/images')
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<string>} - Download URL of the uploaded file
 */
export const uploadFile = async (file, path, progressCallback = null) => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Create a unique filename with timestamp
  const timestamp = new Date().getTime();
  const fileName = `${timestamp}_${file.name}`;
  const fullPath = `${path}/${fileName}`;
  
  // Create storage reference
  const storageRef = ref(storage, fullPath);
  
  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  // Return promise that resolves with download URL when complete
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculate progress percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback(progress);
        }
      },
      (error) => {
        // Handle errors
        reject(error);
      },
      async () => {
        // Upload completed successfully, get download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

/**
 * Upload multiple files to Firebase Storage
 * 
 * @param {Array<File>} files - Array of files to upload
 * @param {string} path - Storage path
 * @param {Function} progressCallback - Optional callback for overall progress
 * @returns {Promise<Array<string>>} - Array of download URLs
 */
export const uploadMultipleFiles = async (files, path, progressCallback = null) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }
  
  const uploadPromises = [];
  const totalFiles = files.length;
  let completedFiles = 0;
  
  // Create upload promises for each file
  for (const file of files) {
    const uploadPromise = uploadFile(
      file,
      path,
      (fileProgress) => {
        // Calculate overall progress if callback provided
        if (progressCallback) {
          const overallProgress = 
            ((completedFiles / totalFiles) + (fileProgress / 100 / totalFiles)) * 100;
          progressCallback(overallProgress);
        }
      }
    ).then(url => {
      completedFiles++;
      return url;
    });
    
    uploadPromises.push(uploadPromise);
  }
  
  // Wait for all uploads to complete
  return Promise.all(uploadPromises);
};

/**
 * Generate a thumbnail URL from a file (if it's an image)
 * 
 * @param {File} file - The file to generate thumbnail for
 * @returns {Promise<string>} - Data URL of the thumbnail
 */
export const generateThumbnail = (file) => {
  return new Promise((resolve, reject) => {
    // Only process image files
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set thumbnail dimensions (max 200px)
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Get file type category based on MIME type
 * 
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} - File type category (Image, Video, Audio, Document, Other)
 */
export const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) {
    return 'Image';
  } else if (mimeType.startsWith('video/')) {
    return 'Video';
  } else if (mimeType.startsWith('audio/')) {
    return 'Audio';
  } else if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('text/') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) {
    return 'Document';
  } else {
    return 'Other';
  }
};
