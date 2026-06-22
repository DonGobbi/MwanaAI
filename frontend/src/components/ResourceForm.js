import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TagManager from './TagManager';
import { uploadFile } from '../services/fileUploadService';
import { db, storage } from '../config/firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { FaSpinner, FaCheck, FaTimes, FaUpload, FaExclamationTriangle, FaPlusCircle } from 'react-icons/fa';

const ResourceForm = ({ resourceId = null }) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [showSubjectModal, setShowSubjectModal] = useState(false);

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
    const fileInputRef = useRef(null);

    // If editing, fetch resource data
    const fetchResourceData = async() => {
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
                        externalUrl: data.data.externalUrl || '',
                        featured: data.data.featured || false,
                        tags: data.data.tags || [],
                        fileType: data.data.fileType || '',
                        fileSize: data.data.fileSize || 0,
                        fileName: data.data.fileName || ''
                    });
                    setTags(data.data.tags || []);
                    setIsLoading(false);
                    return;
                }
            } catch (err) {
                console.log('API fetch failed, trying Firestore');
            }

            // Fallback to Firestore
            const docRef = doc(db, 'resources', resourceId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Handle the new subject data structure
                let subjectValue = '';
                
                // If we have subjectData, use the name from there
                if (data.subjectData && data.subjectData.name) {
                    subjectValue = data.subjectData.id || data.subject;
                    console.log('Found subjectData in resource:', data.subjectData);
                } else if (data.subject) {
                    // For backward compatibility
                    subjectValue = data.subject;
                    console.log('Using legacy subject value:', data.subject);
                }
                
                console.log('Setting subject value for form:', subjectValue);
                
                setFormData({
                    ...data,
                    subject: subjectValue,
                    tags: data.tags || []
                });
                setTags(data.tags || []);
            } else {
                setError('Resource not found');
            }
        } catch (err) {
            console.error('Error fetching resource:', err);
            setError('Failed to load resource data');
        } finally {
            setIsLoading(false);
        }
    };
    
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
            console.log('Fetching subjects from Firebase...');
            const subjectsCollection = collection(db, 'subjects');
            const subjectsSnapshot = await getDocs(subjectsCollection);
            const subjectsList = subjectsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Subjects fetched:', subjectsList);
            setSubjects(subjectsList);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    };
    
    // Handle adding a new subject
    const handleAddNewSubject = async () => {
        if (!newSubject.trim()) return;
        
        try {
            // Add new subject to Firebase
            const subjectsCollection = collection(db, 'subjects');
            const newSubjectData = {
                name: newSubject.trim(),
                description: `Subject for ${newSubject.trim()} resources`,
                icon: 'book', // Default icon
                createdAt: serverTimestamp()
            };
            
            const docRef = await addDoc(subjectsCollection, newSubjectData);
            
            // Add the new subject to the local state
            const newSubjectWithId = {
                id: docRef.id,
                ...newSubjectData
            };
            
            setSubjects(prevSubjects => [...prevSubjects, newSubjectWithId]);
            
            // Select the new subject in the form and store complete subject data
            setFormData(prev => ({
                ...prev,
                // Store the complete subject object
                subjectData: {
                    id: docRef.id,
                    name: newSubject.trim(),
                    description: `Subject for ${newSubject.trim()} resources`
                },
                // Store the subject name directly for display
                subject: newSubject.trim()
            }));
            
            // Close the modal and reset the input
            setShowSubjectModal(false);
            setNewSubject('');
        } catch (error) {
            console.error('Error adding new subject:', error);
            setError(`Failed to add subject: ${error.message}`);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Special handling for subject selection to store complete subject object
        if (name === 'subject' && value) {
            // Find the selected subject object
            const selectedSubject = subjects.find(subject => subject.id === value);
            if (selectedSubject) {
                setFormData({
                    ...formData,
                    // Store the complete subject object
                    subjectData: {
                        id: selectedSubject.id,
                        name: selectedSubject.name,
                        description: selectedSubject.description || ''
                    },
                    // Keep the subject ID for backward compatibility
                    subject: selectedSubject.name
                });
                return;
            }
        }
        
        // Default handling for other form fields
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    // Tag management is now handled by the TagManager component

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);

            // File type is handled by the upload process
            // No need for thumbnail preview generation here
        }
    };

    const handleFileUpload = async() => {
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
                    async() => {
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

    const handleSubmit = async(e) => {
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
            
            // Make sure we're saving the subject data correctly
            // If we have subjectData, keep it; otherwise create it from the subject field
            if (!resourceData.subjectData && resourceData.subject) {
                // We're dealing with a legacy format or direct subject name input
                resourceData.subjectData = {
                    name: resourceData.subject,
                    description: `Subject for ${resourceData.subject}`
                };
            }

            if (!resourceId) {
                resourceData.createdAt = serverTimestamp();
            }

            // Skip API call since backend isn't running
            console.log('Saving resource directly to Firebase...', resourceData);

            // Fallback to Firebase
            if (resourceId) {
                // Update existing document
                await setDoc(doc(db, 'resources', resourceId), resourceData, { merge: true });
            } else {
                // Create new document
                await addDoc(collection(db, 'resources'), resourceData);
            }

            // Show success message
            setSuccess(resourceId ? 'Resource updated successfully!' : 'Resource created successfully!');
            
            // Wait 2 seconds before navigating to give user time to see the success message
            setTimeout(() => {
                // Navigate to the content management page where real Firebase data is displayed
                navigate('/content-management');
            }, 2000);
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
                        <svg 
                            className="w-6 h-6 mr-2 text-primary-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                        Edit Resource
                    </>
                ) : (
                    <>
                        <svg 
                            className="w-6 h-6 mr-2 text-primary-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        Add New Resource
                    </>
                )}
            </h2>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <FaExclamationTriangle className="text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-red-700">{error}</p>
                </div>
            )}
            
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start animate-pulse">
                    <FaCheck className="text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-green-700">{success}</p>
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
                        <div className="flex items-center space-x-2">
                            <select
                                id="subject"
                                name="subject"
                                value={formData.subject || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowSubjectModal(true)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                            >
                                <FaPlusCircle className="mr-1" /> New
                            </button>
                        </div>
                    </div>
                </div>

                {showSubjectModal && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add New Subject</h3>
                                <button 
                                    type="button" 
                                    onClick={() => setShowSubjectModal(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="newSubjectName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="newSubjectName"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                    placeholder="Enter subject name"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSubjectModal(false);
                                        setNewSubject('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddNewSubject}
                                    disabled={!newSubject.trim()}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    Add Subject
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                        <svg 
                            className="w-12 h-12 text-gray-400 mb-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
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
                            <svg 
                                className="w-5 h-5 text-green-500 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                />
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
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : resourceId ? 'Update Resource' : 'Create Resource'}
          </button>
        </div>
      </form>
    </div>
    );
};

export default ResourceForm;