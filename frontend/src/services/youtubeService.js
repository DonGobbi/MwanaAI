import { API_BASE } from '../config/api';

// Fetches a YouTube video's transcript from our backend (which uses yt-dlp),
// so the AI can build lessons/quizzes grounded in the video's content.
export const youtubeService = {
  async getTranscript(url) {
    let res;
    try {
      res = await fetch(`${API_BASE}/api/youtube/transcript?url=${encodeURIComponent(url)}`);
    } catch (_) {
      throw new Error('Could not reach the server. Is the backend running?');
    }
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      /* non-JSON error */
    }
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Could not get the transcript for that video.');
    }
    return data; // { videoId, title, transcript, truncated }
  },
};
