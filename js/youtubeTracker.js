import { VideoParser } from './videoParser.js';

export class YoutubeTracker {
  constructor() {
    this.apiKey = 'AIzaSyBAqHxXzcwUkOUkl9yLdvIdlDpAtgJyDzs';
    this.trackedChannels = [];
    this.alerts = [];
    this.init();
  }

  async init() {
    await this.loadTrackedChannels();
    this.setupEventListeners();
  }

  async loadTrackedChannels() {
    try {
      const stored = localStorage.getItem('trackedChannels');
      this.trackedChannels = stored ? JSON.parse(stored) : [];
      // Add channelMappings property if it doesn't exist
      this.trackedChannels.forEach(channel => {
        if (!channel.channelMappings) {
          channel.channelMappings = [];
        }
        if (typeof channel.extractChannelFromTitle === 'undefined') {
          channel.extractChannelFromTitle = false;
        }
      });
      this.renderTrackedChannels();
    } catch (error) {
      console.error('Error loading tracked channels:', error);
    }
  }

  setupEventListeners() {
    const form = document.getElementById('channel-track-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAddChannel(e));
    }
  }

  async handleAddChannel(e) {
    e.preventDefault();
    const channelUrl = document.getElementById('channel-url').value;
    const datePattern = document.getElementById('date-pattern').value;
    const strictDateMatching = document.getElementById('strict-date-matching').checked;
    const channelId = this.extractChannelId(channelUrl);

    if (!channelId) {
      this.showAlert('Invalid YouTube channel URL', 'error');
      return;
    }

    try {
      const channelInfo = await this.fetchChannelInfo(channelId);
      channelInfo.datePattern = datePattern;
      channelInfo.strictDateMatching = strictDateMatching;
      await this.addTrackedChannel(channelInfo);
      document.getElementById('channel-url').value = '';
      document.getElementById('date-pattern').value = '';
    } catch (error) {
      this.showAlert(`Error adding channel: ${error.message}`, 'error');
    }
  }

  extractChannelId(input) {
    // Treat input as a direct channel ID
    return input.trim();
  }

  async fetchChannelInfo(channelId) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${this.apiKey}`
    );
    const data = await response.json();

    if (!data.items?.length) {
      throw new Error('Channel not found');
    }

    return {
      id: channelId,
      name: data.items[0].snippet.title,
      thumbnail: data.items[0].snippet.thumbnails.default.url,
      lastVideoCheck: null
    };
  }

  async addTrackedChannel(channelInfo) {
    if (this.trackedChannels.some(c => c.id === channelInfo.id)) {
      throw new Error('Channel already tracked');
    }

    channelInfo.channelMappings = [];
    channelInfo.extractChannelFromTitle = false;

    this.trackedChannels.push(channelInfo);
    localStorage.setItem('trackedChannels', JSON.stringify(this.trackedChannels));
    this.renderTrackedChannels();
    this.showAlert(`Successfully added channel: ${channelInfo.name}`);
  }

  renderTrackedChannels() {
    const container = document.getElementById('tracked-channels');
    if (!container) return;

    container.innerHTML = this.trackedChannels.map(channel => `
      <div class="tracked-channel">
        <img src="${channel.thumbnail}" alt="${channel.name}">
        <div class="channel-info">
          <h3>${channel.name}</h3>
          <p>Last checked: ${channel.lastVideoCheck ? new Date(channel.lastVideoCheck).toLocaleString() : 'Never'}</p>
          <p>Date pattern: ${channel.datePattern || 'Default pattern'}</p>
          <p>Strict date matching: ${channel.strictDateMatching ? 'Enabled' : 'Disabled'}</p>
          <p>Extract channel from title: ${channel.extractChannelFromTitle ? 'Enabled' : 'Disabled'}</p>
          <p>Channel mappings: ${channel.channelMappings.length} defined</p>
          <div class="videos-to-check">
            <label for="videos-count-${channel.id}">Videos to check:</label>
            <input type="number" 
                   id="videos-count-${channel.id}" 
                   value="50" 
                   min="1" 
                   max="1000" 
                   step="1" 
                   class="videos-count-input">
          </div>
          <div class="progress-container" id="progress-${channel.id}" style="display: none;">
            <div class="progress-bar"></div>
            <div class="progress-text">0%</div>
          </div>
        </div>
        <button onclick="editChannelPattern('${channel.id}')" class="edit-pattern">
          Edit Pattern
        </button>
        <button onclick="editChannelMappings('${channel.id}')" class="edit-mappings">
          Edit Mappings
        </button>
        <button onclick="removeTrackedChannel('${channel.id}')" class="remove-channel">
          Remove
        </button>
        <button onclick="checkNewVideos('${channel.id}')" class="check-videos">
          Check New Videos
        </button>
      </div>
    `).join('');
  }

  async checkNewVideos(channelId) {
    const channel = this.trackedChannels.find(c => c.id === channelId);
    if (!channel) return;

    // Initialize and show progress bar if it exists
    const progressBar = document.querySelector(`#progress-${channelId}`);
    if (progressBar) {
      progressBar.style.display = 'block';
    }

    const videosCountInput = document.getElementById(`videos-count-${channelId}`);
    const maxResults = videosCountInput ? parseInt(videosCountInput.value) : 50;

    try {
      let pageToken = '';
      let totalProcessedVideos = 0;
      let newVideosCount = 0;
      let skippedVideos = 0;
      const allVideos = [];

      // Calculate how many API calls we need
      const requiredCalls = Math.ceil(maxResults / 50);

      for (let call = 0; call < requiredCalls; call++) {
        if (totalProcessedVideos >= maxResults) break;

        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${this.apiKey}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error.message || 'Failed to fetch videos');
        }

        // Store next page token for subsequent requests
        pageToken = data.nextPageToken;

        const currentBatchVideos = data.items
          .filter(item => item.id.kind === 'youtube#video')
          .map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            url: `https://youtube.com/watch?v=${item.id.videoId}`,
            channelId: channelId,
            channelName: channel.name,
            uploadDate: item.snippet.publishedAt,
            snippet: item.snippet
          }));

        allVideos.push(...currentBatchVideos);

        // Update progress based on total requested videos
        totalProcessedVideos += currentBatchVideos.length;
        if (progressBar) {
          this.updateProgress(channelId, (Math.min(totalProcessedVideos, maxResults) / maxResults) * 100);
        }

        // If no more pages or we've reached the requested amount, break
        if (!pageToken || totalProcessedVideos >= maxResults) break;
      }

      // Process only up to maxResults videos
      const videosToProcess = allVideos.slice(0, maxResults);
      const newVideos = [];

      for (const video of videosToProcess) {
        const parsed = this.parseVideoTitle(video.title, channelId);

        if (parsed) {
          video.parsed = parsed;
          if (this.isNewVideo(video)) {
            newVideos.push(video);
            newVideosCount++;
          }
        } else {
          skippedVideos++;
        }
      }

      await this.updateVideosDatabase(newVideos);

      channel.lastVideoCheck = new Date().toISOString();
      localStorage.setItem('trackedChannels', JSON.stringify(this.trackedChannels));

      const skippedMessage = skippedVideos > 0 ? ` (Pominięto ${skippedVideos} filmów bez pasującego wzorca daty)` : '';
      this.showAlert(`Successfully processed ${videosToProcess.length} videos. Added ${newVideosCount} new videos from ${channel.name}.${skippedMessage}`);

      // Hide progress bar if it exists
      if (progressBar) {
        setTimeout(() => {
          progressBar.style.display = 'none';
          this.renderTrackedChannels();
        }, 1000);
      } else {
        this.renderTrackedChannels();
      }
    } catch (error) {
      console.error('Error checking new videos:', error);
      this.showAlert(`Error checking videos for ${channel.name}: ${error.message}`, 'error');
      if (progressBar) {
        progressBar.style.display = 'none';
      }
    }
  }

  updateProgress(channelId, percentage) {
    const progressBar = document.querySelector(`#progress-${channelId} .progress-bar`);
    const progressText = document.querySelector(`#progress-${channelId} .progress-text`);
    if (progressBar && progressText) {
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `${Math.round(percentage)}%`;
    }
  }

  isNewVideo(videoInfo) {
    const existingVideos = JSON.parse(localStorage.getItem('videos') || '[]');
    return !existingVideos.some(v => v.id === videoInfo.id);
  }

  parseVideoTitle(title, channelId) {
    const channel = this.trackedChannels.find(c => c.id === channelId);
    const parser = new VideoParser();
    const parsed = parser.parseTitle(
      title,
      channelId,
      channel?.datePattern,
      channel?.channelMappings,
      channel?.extractChannelFromTitle
    );

    if (channel?.strictDateMatching && !parsed.date) {
      return null;
    }

    return parsed || {
      date: 'Unknown',
      tvChannel: 'Unknown',
      elements: []
    };
  }

  async updateVideosDatabase(newVideos) {
    // In a real application, this would update a backend database
    // For now, we'll just store in localStorage
    const existingVideos = JSON.parse(localStorage.getItem('videos') || '[]');
    const updatedVideos = [...existingVideos];

    newVideos.forEach(video => {
      const existingIndex = updatedVideos.findIndex(v => v.id === video.id);
      if (existingIndex === -1) {
        updatedVideos.push(video);
      }
    });

    localStorage.setItem('videos', JSON.stringify(updatedVideos));
  }

  showAlert(message, type = 'success') {
    const alertId = Date.now();
    const alert = { id: alertId, message, type };
    this.alerts.push(alert);
    this.renderAlerts();

    // Auto-remove success alerts after 5 seconds
    if (type === 'success') {
      setTimeout(() => this.removeAlert(alertId), 5000);
    }
  }

  removeAlert(alertId) {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    this.renderAlerts();
  }

  renderAlerts() {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    container.innerHTML = this.alerts.map(alert => `
      <div class="alert alert-${alert.type}">
        <span>${alert.message}</span>
        <button onclick="window.youtubeTracker.removeAlert(${alert.id})" class="alert-close">&times;</button>
      </div>
    `).join('');
  }
}