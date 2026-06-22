import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Section from '../components/Section';

const Resources = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data for resources
  const categories = [
    { id: 'all', name: 'All Resources' },
    { id: 'textbooks', name: 'Textbooks' },
    { id: 'worksheets', name: 'Worksheets' },
    { id: 'videos', name: 'Video Lessons' },
    { id: 'practice', name: 'Practice Tests' },
    { id: 'tools', name: 'Learning Tools' }
  ];
  
  const resources = [
    {
      id: 1,
      title: 'Mathematics Form 3 Textbook',
      description: 'Comprehensive textbook covering all Form 3 mathematics topics according to the Malawi curriculum.',
      category: 'textbooks',
      subject: 'Mathematics',
      grade: 'Form 3',
      format: 'PDF',
      size: '12.5 MB',
      downloadable: true,
      image: '/resource-math-textbook.svg',
      placeholder: '/placeholder-image.svg',
      featured: true
    },
    {
      id: 2,
      title: 'Biology Cell Division Worksheet',
      description: 'Practice worksheet with diagrams and questions about mitosis and meiosis.',
      category: 'worksheets',
      subject: 'Biology',
      grade: 'Form 3',
      format: 'PDF',
      size: '2.3 MB',
      downloadable: true,
      image: '/resource-biology-worksheet.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 3,
      title: 'English Grammar Video Series',
      description: 'A series of video lessons covering advanced grammar concepts for Form 3 students.',
      category: 'videos',
      subject: 'English',
      grade: 'Form 3',
      format: 'Video',
      duration: '45 minutes',
      downloadable: false,
      image: '/resource-english-video.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 4,
      title: 'Physics Practice Exam',
      description: 'Full-length practice exam for Form 3 Physics with answers and explanations.',
      category: 'practice',
      subject: 'Physics',
      grade: 'Form 3',
      format: 'PDF',
      size: '4.7 MB',
      downloadable: true,
      image: '/resource-physics-exam.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 5,
      title: 'Chemistry Interactive Periodic Table',
      description: 'Interactive tool to explore the periodic table with element properties and quiz mode.',
      category: 'tools',
      subject: 'Chemistry',
      grade: 'Form 3',
      format: 'Interactive',
      downloadable: false,
      image: '/resource-chemistry-lab.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 6,
      title: 'Geography Map Skills Worksheet',
      description: 'Practice worksheet for developing map reading and interpretation skills.',
      category: 'worksheets',
      subject: 'Geography',
      grade: 'Form 3',
      format: 'PDF',
      size: '3.1 MB',
      downloadable: true,
      image: '/placeholder-image.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 7,
      title: 'History of Malawi Video Documentary',
      description: 'Educational documentary covering key events in Malawian history for Form 3 students.',
      category: 'videos',
      subject: 'History',
      grade: 'Form 3',
      format: 'Video',
      duration: '60 minutes',
      downloadable: false,
      image: '/placeholder-image.svg',
      placeholder: '/placeholder-image.svg'
    },
    {
      id: 8,
      title: 'Mathematics Formula Calculator',
      description: 'Interactive tool to calculate results using mathematical formulas with step-by-step explanations.',
      category: 'tools',
      subject: 'Mathematics',
      grade: 'Form 3',
      format: 'Interactive',
      downloadable: false,
      image: '/placeholder-image.svg',
      placeholder: '/placeholder-image.svg'
    }
  ];
  
  // Filter resources based on active category and search query
  const filteredResources = resources.filter(resource => {
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Get featured resources
  const featuredResources = resources.filter(resource => resource.featured);
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      {/* Hero Section matching About page style */}
      <div className="bg-primary-700 text-white py-16 md:py-24">
        <div className="container">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Educational Resources
            </h1>
            <p className="text-white text-lg mx-auto font-medium max-w-2xl mb-6">
              Access a wide range of learning materials aligned with the Malawi curriculum to support your education journey.
            </p>
          
            {/* Search Bar */}
            <div className="max-w-lg mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for resources..."
                  className="w-full px-4 py-3 rounded-md border-0 shadow-md focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="absolute right-3 top-3 text-primary-500 hover:text-primary-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Category Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container py-2">
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {categories.map(category => (
              <button
                key={category.id}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${
                  activeCategory === category.id
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container py-8">
        {/* Featured Resources Section - Only show if on "all" category and no search */}
        {activeCategory === 'all' && !searchQuery && featuredResources.length > 0 && (
          <Section.Header title="Featured Resources" subtitle="Recommended materials for your current studies" />
        )}
        
        {activeCategory === 'all' && !searchQuery && featuredResources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
            {featuredResources.map(resource => (
              <Card key={resource.id} variant="hover" className="flex flex-col md:flex-row overflow-hidden h-full">
                <div className="md:w-2/5">
                  <img
                    src={resource.image}
                    alt={resource.title}
                    className="h-48 md:h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resource.placeholder;
                    }}
                  />
                </div>
                <div className="p-6 md:w-3/5 flex flex-col">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-900 rounded shadow-sm">
                        {resource.subject} • {resource.grade}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-900 rounded shadow-sm">
                        {resource.format}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{resource.title}</h3>
                    <p className="text-gray-700 mb-4">{resource.description}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <Link to={`/resources/${resource.id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                      View Details
                    </Link>
                    {resource.downloadable ? (
                      <Button variant="primary" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Access
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        
        {/* All Resources Grid */}
        <div>
          <Section.Header 
            title={
              searchQuery 
                ? `Search Results for "${searchQuery}"` 
                : activeCategory !== 'all' 
                  ? categories.find(c => c.id === activeCategory)?.name 
                  : "All Resources"
            } 
            subtitle={`${filteredResources.length} resources available`} 
          />
          
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No resources found</h3>
              <p className="mt-1 text-gray-500">
                Try adjusting your search or filter to find what you're looking for.
              </p>
              <div className="mt-6">
                <Button onClick={() => {setActiveCategory('all'); setSearchQuery('');}} variant="outline">
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                <Card key={resource.id} variant="hover" className="flex flex-col h-full">
                  <Card.Image
                    src={resource.image}
                    alt={resource.title}
                    className="h-48 object-cover"
                    fallbackSrc={resource.placeholder}
                  />
                  <Card.Body className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-900 rounded shadow-sm">
                        {resource.subject}
                      </span>
                      <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-900 rounded shadow-sm">
                        {resource.format}
                      </span>
                    </div>
                    <Card.Title>{resource.title}</Card.Title>
                    <p className="text-gray-700 mb-4">{resource.description}</p>
                    <div className="flex flex-wrap gap-2 mt-auto">
                      <span className="text-xs font-medium text-gray-600">{resource.grade}</span>
                      {resource.size && <span className="text-xs font-medium text-gray-600">• {resource.size}</span>}
                      {resource.duration && <span className="text-xs font-medium text-gray-600">• {resource.duration}</span>}
                    </div>
                  </Card.Body>
                  <Card.Footer className="flex justify-between items-center">
                    <Link to={`/resources/${resource.id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                      View Details
                    </Link>
                    {resource.downloadable ? (
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Access
                      </Button>
                    )}
                  </Card.Footer>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Request Resources Section */}
        <Section className="mt-16 bg-gray-50 rounded-lg border border-gray-200">
          <Section.Header 
            title="Can't find what you need?" 
            subtitle="Request specific educational resources and our team will try to add them to the platform"
            className="text-center"
          />
          <div className="max-w-2xl mx-auto">
            <form className="space-y-4">
              <div>
                <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Type
                </label>
                <select
                  id="resourceType"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select resource type</option>
                  <option value="textbook">Textbook</option>
                  <option value="worksheet">Worksheet</option>
                  <option value="video">Video Lesson</option>
                  <option value="practice">Practice Test</option>
                  <option value="tool">Learning Tool</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="e.g. Mathematics, Biology"
                  />
                </div>
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level
                  </label>
                  <select
                    id="grade"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select grade level</option>
                    <option value="form1">Form 1</option>
                    <option value="form2">Form 2</option>
                    <option value="form3">Form 3</option>
                    <option value="form4">Form 4</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="Please describe the resource you're looking for in detail..."
                ></textarea>
              </div>
              
              <div className="flex justify-center">
                <Button variant="primary" type="submit">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </Section>
      </div>
      
      {/* Download App CTA */}
      <Section bgColor="gray-100" className="mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-6 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Access Resources Offline
            </h2>
            <p className="text-gray-600 mb-6">
              Download the MwanaAI mobile app to access educational resources even without an internet connection. Perfect for studying anywhere, anytime.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.9,19.9l-5.4-3.1l-5.4,3.1l1.4-6.1l-4.6-4l6.2-0.5l2.4-5.8l2.4,5.8l6.2,0.5l-4.6,4L17.9,19.9z"/>
                </svg>
                Google Play
              </Button>
              <Button variant="primary">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5,3H7.5C6.7,3,6,3.7,6,4.5v15C6,20.3,6.7,21,7.5,21h9c0.8,0,1.5-0.7,1.5-1.5v-15C18,3.7,17.3,3,16.5,3z M12,19.5c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S12.8,19.5,12,19.5z M16.5,16h-9V6h9V16z"/>
                </svg>
                App Store
              </Button>
            </div>
          </div>
          <div className="md:w-1/3">
            <img
              src="/app-mockup.png"
              alt="MwanaAI Mobile App"
              className="rounded-lg shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-image.svg";
              }}
            />
          </div>
        </div>
      </Section>
    </div>
  );
};

export default Resources;
