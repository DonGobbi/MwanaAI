# MwanaAI - AI-Powered Learning Platform

MwanaAI is an educational platform designed to provide AI-powered learning experiences tailored to Malawi's curriculum. The platform offers interactive learning tools, resources, and personalized tutoring to enhance educational outcomes for students.

## Project Structure

```
MwanaAI_Project/
├── frontend/                # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── assets/          # Images, icons, etc.
│   │   ├── styles/          # Global styles
│   │   ├── utils/           # Utility functions
│   │   ├── App.js           # Main application component
│   │   └── index.js         # Entry point
│   ├── package.json         # Frontend dependencies
│   └── tailwind.config.js   # Tailwind CSS configuration
└── backend/                 # Backend services (to be implemented)
```

## Features

- **AI Tutor**: Interactive AI-powered tutoring aligned with Malawi's curriculum
- **Dashboard**: Personalized student dashboard with progress tracking
- **Resources**: Educational materials including textbooks, worksheets, and videos
- **Profile Management**: User profile and account settings
- **Responsive Design**: Mobile-friendly interface for accessibility

## Pages

### Home
Landing page introducing MwanaAI with features, benefits, and testimonials.

### Dashboard
User dashboard displaying:
- Course progress
- Recent activities
- Upcoming assignments
- Recommended courses
- Quick links

### AI Tutor
Interactive learning assistant with:
- Subject and topic selection
- Chat interface for questions
- Suggested questions based on selected topics
- Study settings and learning tools

### Resources
Educational materials organized by:
- Categories (textbooks, worksheets, videos, etc.)
- Search functionality
- Featured resources
- Resource request form

### Profile
User profile management with:
- Personal information
- Account settings
- Learning preferences
- Notification settings
- Privacy and security options

## Getting Started

### Prerequisites
- Node.js (v14.x or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/MwanaAI_Project.git
cd MwanaAI_Project
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Start the development server
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Development Guidelines

### Component Structure
- Use functional components with hooks
- Create reusable components in the `components/` directory
- Keep page components in the `pages/` directory

### Styling
- Use Tailwind CSS for styling
- Follow the design system defined in `tailwind.config.js`
- Use the predefined utility classes for consistency

### State Management
- Use React Context API for global state
- Use local state (useState) for component-specific state
- Consider Redux for more complex state management needs

### Code Quality
- Follow ESLint rules
- Write meaningful comments
- Use descriptive variable and function names

## Future Enhancements

- Backend API integration
- Authentication and user management
- Real-time AI tutoring
- Offline access via mobile app
- Analytics dashboard for learning progress
- Content management system for educators

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Malawi Ministry of Education for curriculum guidance
- Contributors and developers
- Educational content partners
