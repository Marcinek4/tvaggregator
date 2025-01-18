export class TableView {
  constructor(searchEngine) {
    this.searchEngine = searchEngine;
    this.currentSort = { column: 'uploadDate', direction: 'desc' };
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.init();
  }

  init() {
    this.renderTable();
  }

  renderTable() {
    const container = document.getElementById('table-container');
    if (!container) return;

    let videos = this.searchEngine.getAllVideos();
    videos = this.sortVideos(videos);

    // Calculate pagination
    const totalPages = Math.ceil(videos.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentVideos = videos.slice(startIndex, endIndex);

    // Check if user has edit permissions
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const canEdit = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th class="sort-header" data-sort="uploadDate">Data dodania ${this.getSortIcon('uploadDate')}</th>
            <th class="sort-header" data-sort="parsed.date">Data nagrania ${this.getSortIcon('parsed.date')}</th>
            <th class="sort-header" data-sort="parsed.tvChannel">Kanał TV ${this.getSortIcon('parsed.tvChannel')}</th>
            <th class="sort-header" data-sort="channelName">Kanał YouTube ${this.getSortIcon('channelName')}</th>
            <th class="sort-header" data-sort="title">Tytuł ${this.getSortIcon('title')}</th>
            <th>Elementy</th>
            <th>Link</th>
            ${canEdit ? '<th>Akcje</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${currentVideos.map(video => `
            <tr data-video-id="${video.id}">
              <td>${new Date(video.uploadDate).toLocaleString('pl-PL')}</td>
              <td>${video.parsed.date || ''}</td>
              <td>${video.parsed.tvChannel || ''}</td>
              <td>${video.channelName}</td>
              <td>${video.title}</td>
              <td>${video.parsed.elements.join(', ')}</td>
              <td><a href="${video.url}" target="_blank" rel="noopener noreferrer">Oglądaj</a></td>
              ${canEdit ? `
                <td>
                  <button onclick="tableView.editVideo('${video.id}')" class="edit-button">
                    Edytuj
                  </button>
                  <button onclick="tableView.deleteVideo('${video.id}')" class="delete-button">
                    Usuń
                  </button>
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const paginationHTML = this.renderPagination(totalPages);
    
    container.innerHTML = tableHTML + paginationHTML;
    
    // Set up sort listeners after rendering the table
    this.setupSortListeners();

    // Make tableView globally available for button click handlers
    window.tableView = this;
  }

  editVideo(videoId) {
    const videos = this.searchEngine.getAllVideos();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const editModal = document.createElement('div');
    editModal.className = 'edit-video-modal';
    editModal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <h2>Edytuj nagranie</h2>
        <form id="edit-video-form">
          <div class="form-group">
            <label for="edit-date">Data nagrania:</label>
            <input type="text" id="edit-date" value="${video.parsed.date || ''}" placeholder="DD.MM.RRRR">
          </div>
          <div class="form-group">
            <label for="edit-tv-channel">Kanał TV:</label>
            <input type="text" id="edit-tv-channel" value="${video.parsed.tvChannel || ''}">
          </div>
          <div class="form-group">
            <label for="edit-title">Tytuł:</label>
            <input type="text" id="edit-title" value="${video.title}">
          </div>
          <div class="form-group">
            <label>Elementy:</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="edit-elements" value="reklama" ${video.parsed.elements.includes('reklama') ? 'checked' : ''}> Reklama</label>
              <label><input type="checkbox" name="edit-elements" value="zapowiedz" ${video.parsed.elements.includes('zapowiedz') ? 'checked' : ''}> Zapowiedź</label>
              <label><input type="checkbox" name="edit-elements" value="ident" ${video.parsed.elements.includes('ident') ? 'checked' : ''}> Ident</label>
              <label><input type="checkbox" name="edit-elements" value="pauza" ${video.parsed.elements.includes('pauza') ? 'checked' : ''}> Pauza</label>
              <label><input type="checkbox" name="edit-elements" value="zakonczenie" ${video.parsed.elements.includes('zakonczenie') ? 'checked' : ''}> Zakończenie emisji/programu</label>
              <label><input type="checkbox" name="edit-elements" value="rozpoczecie" ${video.parsed.elements.includes('rozpoczecie') ? 'checked' : ''}> Rozpoczęcie emisji/programu</label>
              <label><input type="checkbox" name="edit-elements" value="wpadka" ${video.parsed.elements.includes('wpadka') ? 'checked' : ''}> Wpadka</label>
              <label><input type="checkbox" name="edit-elements" value="belka" ${video.parsed.elements.includes('belka') ? 'checked' : ''}> Belka</label>
              <label><input type="checkbox" name="edit-elements" value="studio" ${video.parsed.elements.includes('studio') ? 'checked' : ''}> Studio</label>
              <label><input type="checkbox" name="edit-elements" value="plansza" ${video.parsed.elements.includes('plansza') ? 'checked' : ''}> Plansza</label>
            </div>
          </div>
          <div class="button-group">
            <button type="submit">Zapisz</button>
            <button type="button" onclick="this.closest('.edit-video-modal').remove()">Anuluj</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(editModal);

    const form = document.getElementById('edit-video-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedVideo = {
        ...video,
        title: document.getElementById('edit-title').value,
        parsed: {
          date: document.getElementById('edit-date').value,
          tvChannel: document.getElementById('edit-tv-channel').value,
          elements: Array.from(document.querySelectorAll('input[name="edit-elements"]:checked'))
            .map(cb => cb.value)
        }
      };

      this.updateVideo(videoId, updatedVideo);
      editModal.remove();
    });
  }

  deleteVideo(videoId) {
    if (confirm('Czy na pewno chcesz usunąć to nagranie?')) {
      const videos = this.searchEngine.getAllVideos();
      const updatedVideos = videos.filter(v => v.id !== videoId);
      localStorage.setItem('videos', JSON.stringify(updatedVideos));
      this.renderTable();
    }
  }

  updateVideo(videoId, updatedVideo) {
    const videos = this.searchEngine.getAllVideos();
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
      videos[videoIndex] = updatedVideo;
      localStorage.setItem('videos', JSON.stringify(videos));
      this.renderTable();
    }
  }

  addNewVideo() {
    const editModal = document.createElement('div');
    editModal.className = 'edit-video-modal';
    editModal.innerHTML = `
      <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <h2>Dodaj nowe nagranie</h2>
        <form id="add-video-form">
          <div class="form-group">
            <label for="add-video-id">ID filmu:</label>
            <input type="text" id="add-video-id" required placeholder="np. dQw4w9WgXcQ">
          </div>
          <div class="form-group">
            <label for="add-video-title">Tytuł:</label>
            <input type="text" id="add-video-title" required>
          </div>
          <div class="form-group">
            <label for="add-date">Data nagrania:</label>
            <input type="text" id="add-date" placeholder="DD.MM.RRRR">
          </div>
          <div class="form-group">
            <label for="add-tv-channel">Kanał TV:</label>
            <input type="text" id="add-tv-channel">
          </div>
          <div class="form-group">
            <label for="add-channel-name">Nazwa kanału YouTube:</label>
            <input type="text" id="add-channel-name" required>
          </div>
          <div class="form-group">
            <label for="add-channel-id">ID kanału YouTube:</label>
            <input type="text" id="add-channel-id" required>
          </div>
          <div class="form-group">
            <label>Elementy:</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="add-elements" value="reklama"> Reklama</label>
              <label><input type="checkbox" name="add-elements" value="zapowiedz"> Zapowiedź</label>
              <label><input type="checkbox" name="add-elements" value="spot"> Spot</label>
              <label><input type="checkbox" name="add-elements" value="konkurs"> Konkurs</label>
              <label><input type="checkbox" name="add-elements" value="ident"> Ident</label>
              <label><input type="checkbox" name="add-elements" value="pauza"> Pauza</label>
              <label><input type="checkbox" name="add-elements" value="zakonczenie"> Zakończenie emisji/programu</label>
              <label><input type="checkbox" name="add-elements" value="rozpoczecie"> Rozpoczęcie emisji/programu</label>
              <label><input type="checkbox" name="add-elements" value="wpadka"> Wpadka</label>
              <label><input type="checkbox" name="add-elements" value="belka"> Belka</label>
              <label><input type="checkbox" name="add-elements" value="studio"> Studio</label>
              <label><input type="checkbox" name="add-elements" value="plansza"> Plansza</label>
            </div>
          </div>
          <div class="button-group">
            <button type="submit">Dodaj</button>
            <button type="button" onclick="this.closest('.edit-video-modal').remove()">Anuluj</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(editModal);

    const form = document.getElementById('add-video-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const videoId = document.getElementById('add-video-id').value;
      
      const newVideo = {
        id: videoId,
        title: document.getElementById('add-video-title').value,
        url: `https://youtube.com/watch?v=${videoId}`,
        channelName: document.getElementById('add-channel-name').value,
        channelId: document.getElementById('add-channel-id').value,
        uploadDate: new Date().toISOString(),
        parsed: {
          date: document.getElementById('add-date').value,
          tvChannel: document.getElementById('add-tv-channel').value,
          elements: Array.from(document.querySelectorAll('input[name="add-elements"]:checked'))
            .map(cb => cb.value)
        }
      };

      const videos = this.searchEngine.getAllVideos();
      videos.push(newVideo);
      localStorage.setItem('videos', JSON.stringify(videos));
      this.renderTable();
      editModal.remove();
    });
  }

  renderPagination(totalPages) {
    if (totalPages <= 1) return '';

    let html = '<div class="pagination">';
    
    html += `
      <button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
        &laquo; Poprzednia
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        html += `
          <button ${i === this.currentPage ? 'class="active"' : ''} data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        html += '<span class="pagination-dots">...</span>';
      }
    }

    html += `
      <button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
        Następna &raquo;
      </button>
    `;

    html += '</div>';

    setTimeout(() => {
      const pagination = document.querySelector('.pagination');
      if (pagination) {
        pagination.addEventListener('click', (e) => {
          const button = e.target.closest('button');
          if (button && !button.disabled) {
            this.currentPage = parseInt(button.dataset.page);
            this.renderTable();
            window.scrollTo(0, 0);
          }
        });
      }
    }, 0);

    return html;
  }

  getSortIcon(column) {
    if (this.currentSort.column !== column) {
      return '<span class="sort-icon"></span>';
    }
    return `<span class="sort-icon sort-${this.currentSort.direction}"></span>`;
  }

  setupSortListeners() {
    const headers = document.querySelectorAll('.sort-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        const column = e.target.closest('.sort-header').dataset.sort;
        this.handleSort(column);
      });
    });
  }

  handleSort(column) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }

    this.renderTable();
  }

  sortVideos(videos) {
    return [...videos].sort((a, b) => {
      let valueA = this.getNestedValue(a, this.currentSort.column);
      let valueB = this.getNestedValue(b, this.currentSort.column);

      // Handle null/undefined values
      valueA = valueA ?? '';
      valueB = valueB ?? '';

      // Special handling for dates
      if (this.currentSort.column === 'uploadDate' || this.currentSort.column === 'parsed.date') {
        // For parsed.date, try to convert to comparable format
        if (this.currentSort.column === 'parsed.date') {
          valueA = this.parseDateString(valueA);
          valueB = this.parseDateString(valueB);
        } else {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        }
      }

      // Compare values
      let comparison = 0;
      if (typeof valueA === 'string') {
        comparison = valueA.localeCompare(valueB, 'pl');
      } else {
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }

      // Apply sort direction
      return this.currentSort.direction === 'desc' ? -comparison : comparison;
    });
  }

  parseDateString(dateStr) {
    if (!dateStr) return 0;
    // Convert DD.MM.YYYY to YYYY-MM-DD for proper comparison
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    return 0;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj);
  }
}