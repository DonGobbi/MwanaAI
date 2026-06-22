import React, { useState } from 'react';
import Section from '../components/Section';
import Card from '../components/Card';
import Button from '../components/Button';

const Courses = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Sample course data
  const courses = [
    {
      id: 1,
      title: 'Mathematics - Form 1',
      description: 'Master foundational mathematics concepts including algebra, geometry, and arithmetic.',
      level: 'beginner',
      category: 'mathematics',
      image: '/course-math.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 24,
      duration: '12 weeks',
      students: 1240
    },
    {
      id: 2,
      title: 'English Language - Form 2',
      description: 'Develop strong English language skills through reading, writing, and comprehension exercises.',
      level: 'intermediate',
      category: 'language',
      image: '/course-english.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 32,
      duration: '16 weeks',
      students: 980
    },
    {
      id: 3,
      title: 'Biology - Form 3',
      description: 'Explore the living world through comprehensive lessons on cells, systems, and ecosystems.',
      level: 'intermediate',
      category: 'science',
      image: '/course-biology.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 28,
      duration: '14 weeks',
      students: 850
    },
    {
      id: 4,
      title: 'Physics - Form 4',
      description: 'Understand the fundamental laws of physics through theory and practical applications.',
      level: 'advanced',
      category: 'science',
      image: '/course-physics.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 30,
      duration: '15 weeks',
      students: 720
    },
    {
      id: 5,
      title: 'Chemistry - Form 3',
      description: 'Learn about elements, compounds, and chemical reactions through interactive lessons.',
      level: 'intermediate',
      category: 'science',
      image: '/course-chemistry.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 26,
      duration: '13 weeks',
      students: 790
    },
    {
      id: 6,
      title: 'Geography - Form 2',
      description: 'Discover the physical and human aspects of our world through engaging content.',
      level: 'intermediate',
      category: 'humanities',
      image: '/course-geography.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 22,
      duration: '11 weeks',
      students: 680
    },
    {
      id: 7,
      title: 'Computer Studies - Form 1',
      description: 'Build a strong foundation in computing concepts, hardware, and software.',
      level: 'beginner',
      category: 'technology',
      image: '/course-computer.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 20,
      duration: '10 weeks',
      students: 1100
    },
    {
      id: 8,
      title: 'History - Form 2',
      description: 'Explore Malawian and world history through engaging narratives and primary sources.',
      level: 'intermediate',
      category: 'humanities',
      image: '/course-history.svg',
      placeholder: '/placeholder-image.svg',
      lessons: 24,
      duration: '12 weeks',
      students: 560
    },
  ];
  
  // Filter categories
  const categories = [
    { id: 'all', name: 'All Courses' },
    { id: 'mathematics', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
    { id: 'language', name: 'Language' },
    { id: 'humanities', name: 'Humanities' },
    { id: 'technology', name: 'Technology' },
  ];
  
  // Filter courses based on active filter
  const filteredCourses = activeFilter === 'all' 
    ? courses 
    : courses.filter(course => course.category === activeFilter);
  
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-primary-700 text-white py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Explore Our Courses</h1>
            <p className="text-xl md:text-2xl text-primary-100">
              Discover AI-powered learning experiences designed for the Malawian curriculum
            </p>
          </div>
        </div>
      </section>
      
      {/* Courses Section */}
      <Section bgColor="bg-gray-50">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Available Courses</h2>
          
          <div className="relative">
            <select 
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-4 pr-10 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Filter Pills (Desktop) */}
        <div className="hidden md:flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === category.id 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveFilter(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        
        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCourses.map(course => (
            <Card key={course.id} hover className="h-full flex flex-col">
              <Card.Image 
                src={course.image} 
                alt={course.title}
                className="h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = course.placeholder;
                }}
              />
              <Card.Body className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                    course.level === 'beginner' ? 'bg-green-100 text-green-800' :
                    course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </span>
                  <span className="text-sm text-gray-500">{course.students} students</span>
                </div>
                <Card.Title className="mb-2">{course.title}</Card.Title>
                <Card.Subtitle className="mb-4">{course.description}</Card.Subtitle>
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>{course.lessons} lessons</span>
                  <span>{course.duration}</span>
                </div>
              </Card.Body>
              <Card.Footer className="bg-gray-50">
                <Button 
                  to={`/courses/${course.id}`} 
                  variant="primary" 
                  fullWidth
                >
                  View Course
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
        
        {/* No Results */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-gray-500">Try changing your filter or check back later for new courses.</p>
            <div className="mt-6">
              <Button onClick={() => setActiveFilter('all')} variant="outline">
                View All Courses
              </Button>
            </div>
          </div>
        )}
      </Section>
      
      {/* Call to Action */}
      <Section bgColor="bg-white">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 md:p-12 lg:p-16 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Learning?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Sign up today and get access to all our courses, personalized learning paths, and AI-powered tutoring.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button to="/signup" variant="secondary" size="lg">
              Sign Up for Free
            </Button>
            <Button to="/contact" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary-700" size="lg">
              Contact Us
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default Courses;
