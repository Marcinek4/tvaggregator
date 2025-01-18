export class CalendarView {
  constructor() {
    this.videos = [];
    this.yearData = {};
    this.currentYear = null;
    this.currentSort = { column: 'uploadDate', direction: 'desc' };
    this.init();
  }

  init() {
    this.loadVideos();
    this.processVideos();
    this.renderYearSelector();
    this.showCalendar();
  }

  loadVideos() {
    this.videos = JSON.parse(localStorage.getItem('videos') || '[]');
  }

  processVideos() {
    // Reset year data
    this.yearData = {};
    
    // Process each video
    this.videos.forEach(video => {
      if (!video.parsed.date) return;

      const [day, month, year] = video.parsed.date.split('.');
      if (!year || !month || !day) return;

      // Initialize year if not exists
      if (!this.yearData[year]) {
        this.yearData[year] = {
          months: {}
        };
      }

      // Initialize month if not exists
      if (!this.yearData[year].months[month]) {
        this.yearData[year].months[month] = {
          days: {}
        };
      }

      // Initialize day if not exists
      if (!this.yearData[year].months[month].days[day]) {
        this.yearData[year].months[month].days[day] = [];
      }

      // Add video to day
      this.yearData[year].months[month].days[day].push(video);
    });

    // Set current year to latest year if not set
    if (!this.currentYear) {
      const years = Object.keys(this.yearData).sort((a, b) => b - a);
      this.currentYear = years[0] || new Date().getFullYear();
    }
  }

  renderYearSelector() {
    const container = document.getElementById('year-selector');
    const years = Object.keys(this.yearData).sort((a, b) => b - a);

    if (years.length === 0) {
      container.innerHTML = '<p>Brak nagrań w bazie danych</p>';
      return;
    }

    container.innerHTML = `
      <div class="year-selector">
        <select id="year-select" onchange="calendarView.changeYear(this.value)">
          ${years.map(year => `
            <option value="${year}" ${year === this.currentYear ? 'selected' : ''}>
              ${year}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  changeYear(year) {
    this.currentYear = year;
    this.showCalendar();
  }

  showCalendar() {
    const container = document.getElementById('calendar-container');
    const resultsContainer = document.getElementById('calendar-results');
    
    container.style.display = 'block';
    resultsContainer.style.display = 'none';

    const yearData = this.yearData[this.currentYear];
    if (!yearData) {
      container.innerHTML = '<p>Brak nagrań w wybranym roku</p>';
      return;
    }

    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];

    container.innerHTML = `
      <div class="calendar-grid">
        ${months.map((monthName, index) => {
          const monthNum = (index + 1).toString().padStart(2, '0');
          const monthData = yearData.months[monthNum];
          return this.renderMonth(monthName, monthNum, monthData);
        }).join('')}
      </div>
    `;
  }

  renderMonth(monthName, monthNum, monthData) {
    let html = `
      <div class="calendar-month">
        <h3>${monthName}</h3>
        <div class="calendar-days">
    `;

    // Get number of days in month
    const daysInMonth = new Date(this.currentYear, parseInt(monthNum), 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const day = i.toString().padStart(2, '0');
      const hasVideos = monthData?.days[day]?.length > 0;
      const videoCount = hasVideos ? monthData.days[day].length : 0;
      const intensity = this.getIntensityClass(videoCount);

      html += `
        <div class="calendar-day ${intensity}" 
             ${hasVideos ? `onclick="calendarView.showDayResults('${day}.${monthNum}.${this.currentYear}')"` : ''}>
          ${i}
          ${hasVideos ? `<span class="video-count">${videoCount}</span>` : ''}
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  getIntensityClass(count) {
    if (count === 0) return '';
    if (count <= 2) return 'intensity-1';
    if (count <= 5) return 'intensity-2';
    if (count <= 10) return 'intensity-3';
    return 'intensity-4';
  }

  showDayResults(date) {
    const [day, month, year] = date.split('.');
    const videos = this.yearData[year]?.months[month]?.days[day] || [];
    const sortedVideos = this.sortVideos([...videos]); // Sort the videos

    const container = document.getElementById('calendar-container');
    const resultsContainer = document.getElementById('calendar-results');
    const dateResults = document.getElementById('date-results');

    container.style.display = 'none';
    resultsContainer.style.display = 'block';

    dateResults.innerHTML = `
      <h2>Nagrania z dnia ${date}</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="sort-header" data-sort="uploadDate">
                Data dodania ${this.getSortIcon('uploadDate')}
              </th>
              <th class="sort-header" data-sort="parsed.tvChannel">
                Kanał TV ${this.getSortIcon('parsed.tvChannel')}
              </th>
              <th class="sort-header" data-sort="channelName">
                Kanał YouTube ${this.getSortIcon('channelName')}
              </th>
              <th class="sort-header" data-sort="title">
                Tytuł ${this.getSortIcon('title')}
              </th>
              <th>Elementy</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            ${sortedVideos.map(video => `
              <tr>
                <td>${new Date(video.uploadDate).toLocaleString('pl-PL')}</td>
                <td>${video.parsed.tvChannel || ''}</td>
                <td>${video.channelName}</td>
                <td>${video.title}</td>
                <td>${video.parsed.elements.join(', ')}</td>
                <td><a href="${video.url}" target="_blank" rel="noopener noreferrer">Oglądaj</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Set up sort listeners
    const headers = dateResults.querySelectorAll('.sort-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        const column = e.target.closest('.sort-header').dataset.sort;
        this.handleSort(column, date);
      });
    });
  }

  handleSort(column, date) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }

    this.showDayResults(date);
  }

  sortVideos(videos) {
    return videos.sort((a, b) => {
      let valueA = this.getNestedValue(a, this.currentSort.column);
      let valueB = this.getNestedValue(b, this.currentSort.column);

      valueA = valueA ?? '';
      valueB = valueB ?? '';

      if (this.currentSort.column === 'uploadDate') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }

      let comparison = 0;
      if (typeof valueA === 'string') {
        comparison = valueA.localeCompare(valueB, 'pl');
      } else {
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }

      return this.currentSort.direction === 'desc' ? -comparison : comparison;
    });
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current && current[key] !== undefined ? current[key] : null, obj);
  }

  getSortIcon(column) {
    if (this.currentSort.column !== column) {
      return '<span class="sort-icon"></span>';
    }
    return `<span class="sort-icon sort-${this.currentSort.direction}"></span>`;
  }
}