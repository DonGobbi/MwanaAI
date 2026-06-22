import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import TagManager from './TagManager';
import { uploadFile, generateThumbnail, getFileTypeCategory } from '../services/fileUploadService';
import { db, storage } from '../config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const ResourceForm = ({ resourceId = null }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subject: '',
    gradeLevel: '',
    format: '',
    contentUrl: '',
    imageUrl: '',
    featured: false,
    tags: [],
    fileType: '',
    fileSize: 0,
    fileName: ''
  });
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch subjects for dropdown
    fetchSubjects();
    
    // If editing, fetch resource data
    if (resourceId) {
      fetchResourceData();
    }
  }, [resourceId]);

  // Fetch subjects for dropdown
  const fetchSubjects = async () => {
    try {
      // Try to fetch from API first
      try {
        const response = await fetch('/api/subjects');
        if (response.ok) {
          const data = await response.json();
          setSubjects(data.data);
          return;
        }
      } catch (apiError) {
        console.log('API fetch failed, using Firebase instead');
      }
      
      // Fallback to Firebase if API fails
      const subjectsCollection = collection(db, 'subjects');
      const subjectsSnapshot = await getDocs(subjectsCollection);
      const subjectsList = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubjects(subjectsList);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  // If editing, fetch resource data
  const fetchResourceData = async () => {
    if (!resourceId) return;
    
    setIsLoading(true);
    try {
      // Try API first
      try {
        const response = await fetch(`/api/resources/${resourceId}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            title: data.data.title || '',
            description: data.data.description || '',
            category: data.data.category || '',
            subject: data.data.subject || '',
            gradeLevel: data.data.gradeLevel || '',
            format: data.data.format || '',
            contentUrl: data.data.contentUrl || '',
            imageUrl: data.data.imageUrl || '',
            featured: data.data.featured || false,
            tags: data.data.tags || [],
            fileType: data.data.fileType || '',
            fileSize: data.data.fileSize || 0,
            fileName: data.data.fileName || ''
          });
          
          setTags(data.data.tags || []);
          return;
        }
      } catch (apiError) {
        console.log('API fetch failed, using Firebase instead');
      }
      
      // Fallback to Firebase
      const resourceDoc = doc(db, 'resources', resourceId);
      const resourceSnapshot = await getDoc(resourceDoc);
      
      if (resourceSnapshot.exists()) {
        const resourceData = resourceSnapshot.data();
        
        // Handle the new subject data structure
        let subjectValue = '';
        
        // If we have subjectData, use the ID from there for the dropdown selection
        if (resourceData.subjectData && resourceData.subjectData.id) {
          subjectValue = resourceData.subjectData.id;
          console.log('Found subjectData in resource:', resourceData.subjectData);
        } else if (resourceData.subject) {
          // For backward compatibility
          subjectValue = resourceData.subject;
          console.log('Using legacy subject value:', resourceData.subject);
        }
        
        console.log('Setting subject value for form:', subjectValue);
        
        setFormData({
          title: resourceData.title || '',
          description: resourceData.description || '',
          category: resourceData.category || '',
          subject: subjectValue,  // Use the subject ID for dropdown selection
          subjectData: resourceData.subjectData || null, // Keep the full subject data
          gradeLevel: resourceData.gradeLevel || '',
          format: resourceData.format || '',
          contentUrl: resourceData.contentUrl || '',
          imageUrl: resourceData.imageUrl || '',
          featured: resourceData.featured || false,
          tags: resourceData.tags || [],
          fileType: resourceData.fileType || '',
          fileSize: resourceData.fileSize || 0,
          fileName: resourceData.fileName || ''
        });
        
        setTags(resourceData.tags || []);
      } else {
        setError('Resource not found');
      }
    } catch (err) {
      setError(`Error fetching resource: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for subject selection to store complete subject data
    if (name === 'subject' && value) {
      const selectedSubject = subjects.find(subject => subject.id === value);
      if (selectedSubject) {
        console.log('Selected subject:', selectedSubject);
        setFormData({
          ...formData,
          subjectData: {
            id: selectedSubject.id,
            name: selectedSubject.name,
            description: selectedSubject.description || ''
          },
          subject: value, // Store the ID for the dropdown
          subjectName: selectedSubject.name // Store the name for display
        });
        return;
      }
    }
    
    // Default handling for other fields
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setFormData({
        ...formData,
        tags: updatedTags
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    setFormData({
      ...formData,
      tags: updatedTags
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Generate thumbnail preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setThumbnailPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setThumbnailPreview(null);
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return null;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Try using the uploadFile service first
      try {
        const uploadResult = await uploadFile(
          selectedFile,
          'resources',
          (progress) => setUploadProgress(progress)
        );
        
        setIsUploading(false);
        setUploadProgress(0);
        
        return uploadResult;
      } catch (serviceError) {
        console.log('Service upload failed, using Firebase Storage directly');
      }
      
      // Fallback to Firebase Storage
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `resources/${timestamp}_${selectedFile.name}`);
      
      // Create the upload task
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);
      
      // Return a promise that resolves when the upload is complete
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Track upload progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            // Handle errors
            reject(error);
          },
          async () => {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size
            });
          }
        );
      });
    } catch (err) {
      setError(`File upload failed: ${err.message}`);
      setIsUploading(false);
      setUploadProgress(0);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Upload file if selected
      let fileData = null;
      if (selectedFile) {
        fileData = await handleFileUpload();
        if (!fileData) {
          setError('File upload failed');
          setIsLoading(false);
          return;
        }
        
        // Update form data with file info
        formData.contentUrl = fileData.url;
        formData.fileName = fileData.fileName;
        formData.fileType = fileData.fileType;
        formData.fileSize = fileData.fileSize;
      }
      
      // Prepare resource data
      const resourceData = {
        ...formData,
        updatedAt: serverTimestamp()
      };
      
      // Ensure we have proper subject data structure
      if (formData.subjectData) {
        // We already have the complete subject data
        console.log('Using existing subjectData:', formData.subjectData);
      } else if (formData.subject) {
        // Try to find the subject in the subjects array
        const selectedSubject = subjects.find(s => s.id === formData.subject);
        if (selectedSubject) {
          // Create subjectData from the selected subject
          resourceData.subjectData = {
            id: selectedSubject.id,
            name: selectedSubject.name,
            description: selectedSubject.description || ''
          };
          console.log('Created subjectData from selected subject:', resourceData.subjectData);
        }
      }
      
      if (!resourceId) {
        resourceData.createdAt = serverTimestamp();
      }
      
      // Try API first
      try {
        const endpoint = resourceId ? `/api/resources/${resourceId}` : '/api/resources';
        const method = resourceId ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(resourceData)
        });
        
        if (response.ok) {
          navigate('/content-management');
          return;
        }
      } catch (apiError) {
        console.log('API save failed, using Firebase directly');
      }
      
      // Fallback to Firebase
      if (resourceId) {
        // Update existing document
        await setDoc(doc(db, 'resources', resourceId), resourceData, { merge: true });
      } else {
        // Create new document
        await addDoc(collection(db, 'resources'), resourceData);
      }
      
      // Navigate back to content management
      navigate('/content-management');
    } catch (err) {
      setError(`Error saving resource: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        {resourceId ? (
          <>
            <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Resource
          </>
        ) : (
          <>
            <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Resource
          </>
        )}
      </h2>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-md animate-pulse">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              required
              placeholder="Enter resource title"
            />
          </div>

          <div className="col-span-1">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              required
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            required
            placeholder="Provide a detailed description of this resource"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              required
            >
              <option value="">Select category</option>
              <option value="textbooks">Textbooks</option>
              <option value="worksheets">Worksheets</option>
              <option value="videos">Video Lessons</option>
              <option value="practice">Practice Tests</option>
              <option value="tools">Learning Tools</option>
            </select>
          </div>

          <div className="col-span-1">
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-1">
              Format <span className="text-red-500">*</span>
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              required
            >
              <option value="">Select format</option>
              <option value="PDF">PDF</option>
              <option value="Video">Video</option>
              <option value="Interactive">Interactive</option>
              <option value="Audio">Audio</option>
              <option value="Document">Document</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1">
            <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              value={formData.gradeLevel}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            >
              <option value="">Select grade level</option>
              <option value="Form 1">Form 1</option>
              <option value="Form 2">Form 2</option>
              <option value="Form 3">Form 3</option>
              <option value="Form 4">Form 4</option>
            </select>
          </div>

          <div className="col-span-1">
            <label htmlFor="externalUrl" className="block text-sm font-medium text-gray-700 mb-1">
              External URL
            </label>
            <input
              type="url"
              id="externalUrl"
              name="externalUrl"
              value={formData.externalUrl || ''}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              placeholder="https://example.com/resource"
            />
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 transition-all duration-200 hover:bg-gray-100">
          <label htmlFor="file" className="flex flex-col items-center cursor-pointer">
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-gray-700 mb-1">Drag and drop your file here, or click to browse</span>
            <span className="text-xs text-gray-500">PDF, DOCX, MP4, JPG, PNG, etc.</span>
            <input
              type="file"
              id="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          
          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">{Math.round(uploadProgress)}% uploaded</p>
            </div>
          )}
          
          {formData.contentUrl && !isUploading && (
            <div className="mt-4 flex items-center justify-center p-2 bg-white rounded-lg border border-gray-200">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-700 font-medium">{formData.fileName || 'File uploaded successfully'}</span>
            </div>
          )}
          
          {selectedFile && (
            <div className="mt-2 text-xs text-gray-500">
              <p>Type: {selectedFile.type}</p>
              <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagManager 
            tags={tags} 
            onChange={(updatedTags) => {
              setTags(updatedTags);
              setFormData({
                ...formData,
                tags: updatedTags
              });
            }}
            placeholder="Add a tag (e.g., math, science, history)"
            colorScheme="primary"
          />
          <p className="mt-1 text-xs text-gray-500">
            Tags help users find related content and improve search results.
          </p>
        </div>

        {/* Featured */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={handleChange}
              className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="featured" className="font-medium text-gray-700">
              Featured Resource
            </label>
            <p className="text-gray-500">Featured resources will be highlighted on the resources page.</p>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/content-management')}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Resource'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResourceForm;
