import React from 'react';

const About = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-primary-700 text-white py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About MwanaAI</h1>
            <p className="text-xl md:text-2xl text-primary-100">
              Our mission, vision, and the team behind the platform
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Our Story</h2>
              <p className="text-lg text-gray-600 mb-6">How MwanaAI came to be</p>
              <h3 className="text-2xl font-bold text-primary-600 mb-4">MwanaAI Story</h3>
              <p className="text-gray-700 mb-4">
                MwanaAI was born from a simple yet powerful vision: to make quality education accessible to every student in Malawi, regardless of their location or economic background.
              </p>
              <p className="text-gray-700 mb-4">
                In a country where many students face challenges accessing educational resources, we saw an opportunity to leverage artificial intelligence to bridge this gap. By combining AI technology with educational content aligned to the Malawian curriculum, we created a platform that can provide personalized learning experiences to students across the country.
              </p>
              <p className="text-gray-700">
                What started as a small project has grown into a comprehensive learning platform that serves thousands of students, helping them achieve their educational goals and unlock their full potential.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-xl">
                <img 
                  src="/story-image.svg" 
                  alt="Students learning with MwanaAI" 
                  className="w-full h-full object-cover transform-gpu"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-image.svg';
                  }}
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-secondary-500 rounded-full z-0 transform-gpu backface-visibility-hidden"></div>
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-primary-300 rounded-full z-0 transform-gpu backface-visibility-hidden"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and Vision Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Our Mission</h2>
            <p className="text-lg text-gray-600">What drives us every day</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="inline-block p-3 bg-primary-100 text-primary-600 rounded-lg mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Mission</h3>
              <p className="text-gray-700">
                To democratize access to quality education in Malawi through innovative AI-powered learning solutions that are accessible, engaging, and effective.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="inline-block p-3 bg-secondary-100 text-secondary-600 rounded-lg mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Vision</h3>
              <p className="text-gray-700">
                A Malawi where every student has equal access to quality educational resources, enabling them to reach their full potential and contribute to the nation's development.
              </p>
            </div>
          </div>
          
          {/* Values */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Values</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { title: 'Accessibility for all', icon: 'M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z' },
                { title: 'Educational excellence', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z M12 14l-6.16-3.422a12.083 12.083 0 00-.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 016.824-2.998 12.078 12.078 0 00-.665-6.479L12 14z' },
                { title: 'Innovation and adaptation', icon: 'M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z' },
                { title: 'Cultural relevance', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                { title: 'Community empowerment', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              ].map((value, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="inline-block p-3 bg-primary-50 text-primary-600 rounded-full mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={value.icon} />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-800">{value.title}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Our Team</h2>
            <p className="text-lg text-gray-600">The people behind MwanaAI</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'John Banda',
                role: 'Founder & CEO',
                bio: 'Educational technology expert with a passion for expanding access to quality education in Malawi.',
                image: '/team-member-1.svg',
                placeholder: '/placeholder-image.svg'
              },
              {
                name: 'Mary Phiri',
                role: 'Education Director',
                bio: 'Former teacher with 15 years of experience in the Malawian education system.',
                image: '/team-member-2.svg',
                placeholder: '/placeholder-image.svg'
              },
              {
                name: 'David Mwanza',
                role: 'AI Specialist',
                bio: 'AI specialist focused on developing educational technology solutions for African contexts.',
                image: '/team-member-3.svg',
                placeholder: '/placeholder-image.svg'
              },
              {
                name: 'Grace Nyirenda',
                role: 'Curriculum Specialist',
                bio: 'Curriculum development specialist with expertise in creating engaging educational content.',
                image: '/team-member-4.svg',
                placeholder: '/placeholder-image.svg'
              }
            ].map((member, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="aspect-w-1 aspect-h-1">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = member.placeholder;
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">Team Member</h3>
                  <h4 className="text-lg font-semibold text-primary-600 mb-2">{member.name}</h4>
                  <p className="text-gray-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-700">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Our Partners</h2>
            <p className="text-lg text-gray-600">Organizations that support our mission</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {[
              { name: 'EduTech Malawi', logo: '/partner-logo-1.svg' },
              { name: 'Digital Learning Hub', logo: '/partner-logo-2.svg' },
              { name: 'Global Education Partners', logo: '/partner-logo-3.svg' },
              { name: 'Partner 4', logo: '/placeholder-image.svg' },
              { name: 'Partner 5', logo: '/placeholder-image.svg' },
              { name: 'Partner 6', logo: '/placeholder-image.svg' }
            ].map((partner, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">{partner.name}</div>
                  <img 
                    src={partner.logo} 
                    alt={partner.name} 
                    className="h-12 w-auto mx-auto transform-gpu"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-image.svg';
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
