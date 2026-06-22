import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Section from '../components/Section';
import { db } from '../config/firebase';
import { collection, doc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';

// File type icons helper function
const getFileTypeIcon = (fileType) => {
  const iconClass = "w-4 h-4";
  
  if (!fileType) return null;
  
  const type = fileType.toLowerCase();
  
  if (type.includes('pdf')) {
    return (
      <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  } else if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    );
  } else if (type.includes('video') || ['mp4', 'mov', 'avi', 'webm'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
      </svg>
    );
  } else if (type.includes('audio') || ['mp3', 'wav', 'ogg'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
      </svg>
    );
  } else if (['doc', 'docx', 'txt', 'rtf'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-blue-400`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  } else if (['ppt', 'pptx'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-orange-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    );
  } else if (['xls', 'xlsx', 'csv'].some(ext => type.includes(ext))) {
    return (
      <svg className={`${iconClass} text-green-600`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
      </svg>
    );
  } else {
    return (
      <svg className={`${iconClass} text-gray-500`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  }
};

const ContentManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resources');
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showResourceModal, setShowResourceModal] = useState(false);

  useEffect(() => {
    // Fetch initial data based on active tab
    fetchData(activeTab);
  }, [activeTab]);

  // Mock data for when backend is unavailable
  const mockData = {
    resources: [
      {
        id: 'mock-resource-1',
        title: 'Introduction to Mathematics',
        description: 'A comprehensive guide to basic mathematics concepts',
        category: 'academic',
        subject: 'Mathematics',
        gradeLevel: 'Grade 5',
        format: 'pdf',
        imageUrl: 'https://via.placeholder.com/300x200',
        contentUrl: 'https://example.com/math-intro.pdf',
        featured: true,
        tags: ['math', 'elementary', 'basics'],
        fileType: 'application/pdf',
        fileSize: 2500000,
        fileName: 'math-intro.pdf',
        createdAt: '2023-01-15T08:30:00Z',
        updatedAt: '2023-01-15T08:30:00Z'
      },
      {
        id: 'mock-resource-2',
        title: 'Science Experiments for Kids',
        description: 'Fun and educational science experiments for children',
        category: 'activities',
        subject: 'Science',
        gradeLevel: 'Grade 3',
        format: 'video',
        imageUrl: 'https://via.placeholder.com/300x200',
        contentUrl: 'https://example.com/science-experiments.mp4',
        featured: false,
        tags: ['science', 'experiments', 'kids'],
        fileType: 'video/mp4',
        fileSize: 15000000,
        fileName: 'science-experiments.mp4',
        createdAt: '2023-02-20T10:15:00Z',
        updatedAt: '2023-02-20T10:15:00Z'
      },
      {
        id: 'mock-resource-3',
        title: 'History Timeline Poster',
        description: 'Visual timeline of major historical events',
        category: 'reference',
        subject: 'History',
        gradeLevel: 'Grade 7',
        format: 'image',
        imageUrl: 'https://via.placeholder.com/300x200',
        contentUrl: 'https://example.com/history-timeline.jpg',
        featured: true,
        tags: ['history', 'timeline', 'visual'],
        fileType: 'image/jpeg',
        fileSize: 5000000,
        fileName: 'history-timeline.jpg',
        createdAt: '2023-03-10T14:45:00Z',
        updatedAt: '2023-03-10T14:45:00Z'
      }
    ],
    subjects: [
      { id: 'subject-1', name: 'Mathematics', description: 'Numbers, algebra, geometry, and more' },
      { id: 'subject-2', name: 'Science', description: 'Physics, chemistry, biology, and earth sciences' },
      { id: 'subject-3', name: 'History', description: 'World history, civilizations, and important events' },
      { id: 'subject-4', name: 'English', description: 'Language arts, literature, and writing' }
    ],
    topics: [
      { id: 'topic-1', name: 'Algebra', subjectId: 'subject-1', description: 'Study of mathematical symbols and rules' },
      { id: 'topic-2', name: 'Geometry', subjectId: 'subject-1', description: 'Study of shapes and spaces' },
      { id: 'topic-3', name: 'Biology', subjectId: 'subject-2', description: 'Study of living organisms' },
      { id: 'topic-4', name: 'Chemistry', subjectId: 'subject-2', description: 'Study of matter and its properties' }
    ]
  };

  const fetchData = async (tabName) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch data directly from Firebase Firestore
      switch (tabName) {
        case 'resources':
          try {
            console.log('Fetching resources from Firebase...');
            const resourcesCollection = collection(db, 'resources');
            const resourcesQuery = query(resourcesCollection, orderBy('createdAt', 'desc'));
            const resourcesSnapshot = await getDocs(resourcesQuery);
            
            const resourcesList = resourcesSnapshot.docs.map(doc => {
              const data = doc.data();
              
              // Process the resource data
              return {
                id: doc.id,
                ...data,
                // Convert Firebase timestamps to JS dates for display
                createdAt: data.createdAt ? new Date(data.createdAt.toMillis()) : new Date(),
                updatedAt: data.updatedAt ? new Date(data.updatedAt.toMillis()) : new Date(),
                // Handle subject display based on new data structure
                // If we have subjectData, use it; otherwise use subject field directly
                subject: data.subjectData ? data.subjectData.name : data.subject || 'Unknown'
              };
            });
            
            console.log('Resources fetched from Firebase:', resourcesList);
            setResources(resourcesList);
          } catch (firebaseError) {
            console.error('Error fetching resources from Firebase:', firebaseError);
            setError(`Failed to fetch resources: ${firebaseError.message}`);
            // Fallback to mock data only if Firebase fetch fails
            setResources(mockData.resources);
          }
          break;
          
        case 'subjects':
          try {
            console.log('Fetching subjects from Firebase...');
            const subjectsCollection = collection(db, 'subjects');
            const subjectsQuery = query(subjectsCollection, orderBy('createdAt', 'desc'));
            const subjectsSnapshot = await getDocs(subjectsQuery);
            
            const subjectsList = subjectsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
              updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt.toMillis()) : new Date()
            }));
            
            console.log('Subjects fetched from Firebase:', subjectsList);
            setSubjects(subjectsList);
          } catch (firebaseError) {
            console.error('Error fetching subjects from Firebase:', firebaseError);
            setError(`Failed to fetch subjects: ${firebaseError.message}`);
            // Fallback to mock data only if Firebase fetch fails
            setSubjects(mockData.subjects);
          }
          break;
          
        case 'topics':
          try {
            console.log('Fetching topics from Firebase...');
            const topicsCollection = collection(db, 'topics');
            const topicsQuery = query(topicsCollection, orderBy('createdAt', 'desc'));
            const topicsSnapshot = await getDocs(topicsQuery);
            
            const topicsList = topicsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt ? new Date(doc.data().createdAt.toMillis()) : new Date(),
              updatedAt: doc.data().updatedAt ? new Date(doc.data().updatedAt.toMillis()) : new Date()
            }));
            
            console.log('Topics fetched from Firebase:', topicsList);
            setTopics(topicsList);
          } catch (firebaseError) {
            console.error('Error fetching topics from Firebase:', firebaseError);
            setError(`Failed to fetch topics: ${firebaseError.message}`);
            // Fallback to mock data only if Firebase fetch fails
            setTopics(mockData.topics);
          }
          break;
          
        default:
          // Default to resources
          fetchData('resources');
      }
    } catch (err) {
      setError(`Error in fetchData: ${err.message}`);
      console.error('General error in fetchData:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleAddNew = (type) => {
    switch (type) {
      case 'resource':
        navigate('/content-management/resource/new');
        break;
      case 'subject':
        navigate('/content-management/subject/new');
        break;
      case 'topic':
        navigate('/content-management/topic/new');
        break;
      default:
        navigate('/content-management/resource/new');
    }
  };

  const handleEdit = (type, id) => {
    navigate(`/${type}-form/${id}`);
  };
  
  const handleViewResource = (resource) => {
    setSelectedResource(resource);
    setShowResourceModal(true);
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let collectionName;
      switch (type) {
        case 'resource':
          collectionName = 'resources';
          break;
        case 'subject':
          collectionName = 'subjects';
          break;
        case 'topic':
          collectionName = 'topics';
          break;
        default:
          throw new Error('Invalid type');
      }
      
      console.log(`Deleting ${type} with ID ${id} from Firebase...`);
      
      // Delete directly from Firebase
      await deleteDoc(doc(db, collectionName, id));
      console.log(`Successfully deleted ${type} with ID ${id}`);
      
      // Show success message
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
      
      // Refresh data
      fetchData(activeTab);
    } catch (err) {
      setError(`Error deleting ${type}: ${err.message}`);
      console.error(`Error deleting ${type}:`, err);
      alert(`Failed to delete ${type}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Function to get file extension from file name or type
  const getFileExtension = (resource) => {
    if (!resource) return 'Unknown';
    
    if (resource.fileName) {
      const parts = resource.fileName.split('.');
      if (parts.length > 1) {
        return parts[parts.length - 1].toUpperCase();
      }
    }
    
    if (resource.fileType) {
      // Extract extension from MIME type if available
      const type = resource.fileType.toLowerCase();
      if (type.includes('pdf')) return 'PDF';
      if (type.includes('image')) return 'IMG';
      if (type.includes('video')) return 'VID';
      if (type.includes('audio')) return 'AUD';
      if (type.includes('word') || type.includes('document')) return 'DOC';
      if (type.includes('excel') || type.includes('sheet')) return 'XLS';
      if (type.includes('powerpoint') || type.includes('presentation')) return 'PPT';
      if (type.includes('text')) return 'TXT';
      return type.split('/')[1]?.toUpperCase() || 'FILE';
    }
    
    return 'N/A';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Resource Details Modal */}
      {showResourceModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-gray-900">{selectedResource.title}</h2>
                <button 
                  onClick={() => setShowResourceModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Description</h3>
                    <p className="mt-2 text-gray-600 whitespace-pre-wrap">{selectedResource.description}</p>
                  </div>
                  
                  {selectedResource.contentUrl && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Content</h3>
                      <div className="mt-2">
                        {selectedResource.fileType?.includes('image') ? (
                          <img 
                            src={selectedResource.contentUrl} 
                            alt={selectedResource.title} 
                            className="max-w-full h-auto rounded-lg shadow-md"
                          />
                        ) : selectedResource.fileType?.includes('video') ? (
                          <video 
                            controls 
                            className="max-w-full rounded-lg shadow-md"
                          >
                            <source src={selectedResource.contentUrl} type={selectedResource.fileType} />
                            Your browser does not support the video tag.
                          </video>
                        ) : selectedResource.fileType?.includes('audio') ? (
                          <audio 
                            controls 
                            className="w-full"
                          >
                            <source src={selectedResource.contentUrl} type={selectedResource.fileType} />
                            Your browser does not support the audio tag.
                          </audio>
                        ) : selectedResource.fileType?.includes('pdf') ? (
                          <div className="mt-2">
                            <a 
                              href={selectedResource.contentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                            >
                              View PDF
                              <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <a 
                              href={selectedResource.contentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                            >
                              Download File
                              <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Details</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Category:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedResource.category || 'N/A'}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Subject:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedResource.subject || 'N/A'}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Grade Level:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedResource.gradeLevel || 'N/A'}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Format:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedResource.format || 'N/A'}</span>
                    </div>
                    
                    {selectedResource.fileName && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">File Name:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedResource.fileName}</span>
                      </div>
                    )}
                    
                    {selectedResource.fileSize && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">File Size:</span>
                        <span className="ml-2 text-sm text-gray-900">
                          {(selectedResource.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                    
                    {selectedResource.fileType && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">File Type:</span>
                        <span className="ml-2 text-sm text-gray-900">{selectedResource.fileType}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Featured:</span>
                      <span className="ml-2 text-sm text-gray-900">{selectedResource.featured ? 'Yes' : 'No'}</span>
                    </div>
                    
                    {selectedResource.tags && selectedResource.tags.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Tags:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedResource.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Created:</span>
                      <span className="ml-2 text-sm text-gray-900">{formatDate(selectedResource.createdAt)}</span>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                      <span className="ml-2 text-sm text-gray-900">{formatDate(selectedResource.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    handleEdit('resource', selectedResource.id);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Edit Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Section>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Content Management</h1>
        
        {/* Tabs */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="space-y-6">
            <button
              onClick={() => handleTabChange('resources')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'resources'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resources
            </button>
            <button
              onClick={() => handleTabChange('subjects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subjects'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subjects
            </button>
            <button
              onClick={() => handleTabChange('topics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'topics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Topics
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center my-8">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {/* Content based on active tab */}
        <div className="mt-6">
          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Educational Resources</h2>
                <Button 
                  variant="primary" 
                  onClick={() => handleAddNew('resource')}
                >
                  Add New Resource
                </Button>
              </div>
              
              {resources.length === 0 && !isLoading ? (
                <p className="text-gray-500 text-center py-8">No resources found. Add your first resource to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {resources.map((resource) => (
                        <tr key={resource.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {resource.imageUrl && (
                                <div className="flex-shrink-0 h-10 w-10 mr-4">
                                  <img className="h-10 w-10 rounded-md object-cover" src={resource.imageUrl} alt={resource.title} />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{resource.title}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">{resource.description}</div>
                                {resource.fileName && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {resource.fileName} {resource.fileSize ? `(${(resource.fileSize / 1024 / 1024).toFixed(2)} MB)` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {resource.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resource.subject ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                {resource.subject}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resource.fileType || resource.fileName ? (
                              <div className="flex items-center">
                                {getFileTypeIcon(resource.fileType)}
                                <span className="ml-1 text-xs text-gray-600">
                                  {getFileExtension(resource)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resource.featured ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Featured
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleViewResource(resource)} 
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleEdit('resource', resource.id)} 
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete('resource', resource.id)} 
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Subject Management</h2>
                <Button 
                  variant="primary" 
                  onClick={() => handleAddNew('subject')}
                >
                  Add New Subject
                </Button>
              </div>
              
              {subjects.length === 0 && !isLoading ? (
                <p className="text-gray-500 text-center py-8">No subjects found. Add your first subject to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{subject.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{subject.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleEdit('subject', subject.id)} 
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete('subject', subject.id)} 
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === 'topics' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Topic Management</h2>
                <Button 
                  variant="primary" 
                  onClick={() => handleAddNew('topic')}
                >
                  Add New Topic
                </Button>
              </div>
              
              {topics.length === 0 && !isLoading ? (
                <p className="text-gray-500 text-center py-8">No topics found. Add your first topic to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade Level</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Topics</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topics.map((topic) => (
                        <tr key={topic.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{topic.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{topic.subject}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{topic.gradeLevel}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {topic.relatedTopics && topic.relatedTopics.length > 0 ? (
                                topic.relatedTopics.map((relatedTopic, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {relatedTopic}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">None</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleEdit('topic', topic.id)} 
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDelete('topic', topic.id)} 
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default ContentManagement;
