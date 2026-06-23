const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Firebase configuration
const firebase = require('./config/firebase');

// Basic route
app.get('/', (req, res) => {
  res.send('MwanaAI API is running');
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/tutor', require('./routes/tutor'));
app.use('/api/users', require('./routes/users'));
app.use('/api/youtube', require('./routes/youtube'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // Keep yt-dlp fresh (best-effort) so YouTube transcripts keep working.
  require('./utils/ytdlp').scheduleYtDlpUpdates();
});
