import { VideoParser } from './videoParser.js';
import { SearchEngine } from './searchEngine.js';
import { ResultsRenderer } from './resultsRenderer.js';
import { AuthManager } from './authManager.js';

class App {
  constructor() {
    this.videoParser = new VideoParser();
    this.searchEngine = new SearchEngine();
    this.resultsRenderer = new ResultsRenderer();
    this.authManager = new AuthManager();
    
    this.init();
  }

  init() {
    this.authManager.checkAuthStatus();
    this.setupEventListeners();
    this.loadYouTubeChannels();
    this.loadTvChannels();
  }

  setupEventListeners() {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => this.handleSearch(e));
    }
  }

  async loadYouTubeChannels() {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    // Create a Map to store unique channel entries, using channelId as the key
    const channelMap = new Map();
    
    // Process each video and store unique channels
    videos.forEach(video => {
      if (video.channelId && video.channelName) {
        channelMap.set(video.channelId, {
          id: video.channelId,
          name: video.channelName
        });
      }
    });

    // Convert Map values to array and sort by name
    const channels = Array.from(channelMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    this.populateChannelSelect(channels);
  }

  populateChannelSelect(channels) {
    const select = document.getElementById('youtube-channel');
    if (!select) return;
    
    select.innerHTML = '<option value="">Wszystkie</option>';
    channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.id;
      option.textContent = channel.name;
      select.appendChild(option);
    });
  }

  async loadTvChannels() {
    const tvChannelSelect = document.getElementById('tv-channel');
    if (!tvChannelSelect) return;

    const channels = this.searchEngine.getAllTvChannels();
    tvChannelSelect.innerHTML = '<option value="">Wszystkie</option>';
    
    channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel;
      option.textContent = channel;
      tvChannelSelect.appendChild(option);
    });
  }

  handleSearch(e) {
    e.preventDefault();
    
    const searchParams = {
      tvChannel: document.getElementById('tv-channel').value,
      date: document.getElementById('date').value,
      youtubeChannel: document.getElementById('youtube-channel').value,
      elements: Array.from(document.querySelectorAll('input[name="elements"]:checked'))
        .map(cb => cb.value),
      program: document.getElementById('program').value
    };

    const results = this.searchEngine.search(searchParams);
    this.resultsRenderer.render(results);
  }
}

new App();