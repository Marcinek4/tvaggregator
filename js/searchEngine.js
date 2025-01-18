export class SearchEngine {
  constructor() {
    this.loadVideos();
  }

  loadVideos() {
    try {
      // Load videos from localStorage instead of using mock data
      const stored = localStorage.getItem('videos');
      this.videos = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading videos:', error);
      this.videos = [];
    }
  }

  getAllTvChannels() {
    return [...new Set(this.videos.map(video => video.parsed.tvChannel))]
      .filter(channel => channel) // Remove null/undefined values
      .sort();
  }

  getAllVideos() {
    // Reload videos from localStorage to ensure we have the latest data
    this.loadVideos();
    return [...this.videos];
  }

  search(params) {
    // Reload videos before searching to ensure we have the latest data
    this.loadVideos();
    return this.videos.filter(video => {
      return this.matchesSearchCriteria(video, params);
    });
  }

  matchesSearchCriteria(video, params) {
    const { tvChannel, date, youtubeChannel, elements, program } = params;

    if (tvChannel && !this.matchesTvChannel(video, tvChannel)) return false;
    if (date && !this.matchesDate(video, date)) return false;
    if (youtubeChannel && video.channelId !== youtubeChannel) return false;
    if (elements && elements.length && !this.matchesElements(video, elements)) return false;
    if (program && !this.matchesProgram(video, program)) return false;

    return true;
  }

  matchesTvChannel(video, searchTvChannel) {
    return video.parsed.tvChannel?.toLowerCase()
      .includes(searchTvChannel.toLowerCase());
  }

  matchesDate(video, searchDate) {
    if (!video.parsed.date) return false;
    
    // Split dates into components
    const videoParts = video.parsed.date.split('.');
    const searchParts = searchDate.split('.');
    
    // If search has less parts than video date (e.g., only year or month.year),
    // compare only the provided parts from right to left
    for (let i = 1; i <= searchParts.length; i++) {
      const searchValue = searchParts[searchParts.length - i];
      const videoValue = videoParts[videoParts.length - i];
      
      // Skip empty parts in search
      if (!searchValue) continue;
      
      // If any part doesn't match, return false
      if (searchValue !== videoValue) return false;
    }
    
    return true;
  }

  matchesElements(video, searchElements) {
    return searchElements.every(element => 
      video.parsed.elements?.includes(element)
    );
  }

  matchesProgram(video, searchProgram) {
    return video.title.toLowerCase()
      .includes(searchProgram.toLowerCase());
  }
}