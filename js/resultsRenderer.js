export class ResultsRenderer {
  constructor() {
    this.container = document.getElementById('results-container');
    this.itemsPerPage = 50;
    this.currentPage = 1;
    this.displayMode = localStorage.getItem('displayMode') || 'cards';
    this.currentResults = [];
    this.currentSort = { column: 'uploadDate', direction: 'desc' };
  }

  render(results) {
    if (results) {
      this.currentResults = results;
      this.currentPage = 1;
    }
    
    this.container.innerHTML = '';
    
    const wrapper = document.createElement('section');
    wrapper.className = 'results-wrapper';
    this.container.appendChild(wrapper);

    if (this.currentResults.length === 0) {
      this.renderNoResults(wrapper);
      return;
    }

    this.renderDisplayControls(wrapper);

    // Sort results if in table mode
    let displayResults = [...this.currentResults];
    if (this.displayMode === 'table') {
      displayResults = this.sortResults(displayResults);
    }

    const totalPages = Math.ceil(displayResults.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentPageResults = displayResults.slice(startIndex, endIndex);

    const contentContainer = document.createElement('div');
    contentContainer.className = this.displayMode === 'cards' ? 'cards-container' : 'table-container';
    wrapper.appendChild(contentContainer);

    if (this.displayMode === 'cards') {
      this.renderCards(currentPageResults, contentContainer);
    } else {
      this.renderTable(currentPageResults, contentContainer);
    }

    this.renderPagination(totalPages, wrapper);
  }

  sortResults(results) {
    return results.sort((a, b) => {
      let valueA = this.getNestedValue(a, this.currentSort.column);
      let valueB = this.getNestedValue(b, this.currentSort.column);

      valueA = valueA ?? '';
      valueB = valueB ?? '';

      if (this.currentSort.column === 'uploadDate' || this.currentSort.column === 'parsed.date') {
        if (this.currentSort.column === 'parsed.date') {
          valueA = this.parseDateString(valueA);
          valueB = this.parseDateString(valueB);
        } else {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        }
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

  parseDateString(dateStr) {
    if (!dateStr) return 0;
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    return 0;
  }

  renderTable(results, container) {
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th class="sort-header" data-sort="uploadDate">
              Data dodania ${this.getSortIcon('uploadDate')}
            </th>
            <th class="sort-header" data-sort="parsed.date">
              Data nagrania ${this.getSortIcon('parsed.date')}
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
          ${results.map(result => `
            <tr>
              <td>${new Date(result.uploadDate).toLocaleString('pl-PL')}</td>
              <td>${result.parsed.date || ''}</td>
              <td>${result.parsed.tvChannel || ''}</td>
              <td>${result.channelName}</td>
              <td>${result.title}</td>
              <td>${result.parsed.elements.join(', ')}</td>
              <td><a href="${result.url}" target="_blank" rel="noopener noreferrer">Oglądaj</a></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Set up sort listeners
    container.querySelectorAll('.sort-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const column = e.target.closest('.sort-header').dataset.sort;
        if (this.currentSort.column === column) {
          this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          this.currentSort.column = column;
          this.currentSort.direction = 'asc';
        }
        this.render();
      });
    });
  }

  getSortIcon(column) {
    if (this.currentSort.column !== column) {
      return '<span class="sort-icon"></span>';
    }
    return `<span class="sort-icon sort-${this.currentSort.direction}"></span>`;
  }

  renderDisplayControls(wrapper) {
    const controls = document.createElement('div');
    controls.className = 'display-controls';
    controls.innerHTML = `
      <label>Widok:</label>
      <select id="display-mode">
        <option value="cards" ${this.displayMode === 'cards' ? 'selected' : ''}>Kafelki</option>
        <option value="table" ${this.displayMode === 'table' ? 'selected' : ''}>Tabela</option>
      </select>
    `;

    controls.querySelector('#display-mode').addEventListener('change', (e) => {
      this.displayMode = e.target.value;
      localStorage.setItem('displayMode', this.displayMode);
      this.render();  
    });

    wrapper.appendChild(controls);
  }

  renderNoResults(wrapper) {
    wrapper.innerHTML = `
      <div class="no-results">
        <p>Nie znaleziono wyników spełniających kryteria wyszukiwania.</p>
      </div>
    `;
  }

  renderCards(results, container) {
    results.forEach(result => {
      const card = document.createElement('div');
      card.className = 'result-card';
      
      card.innerHTML = `
        <h3>${result.title}</h3>
        <p>Data: ${result.parsed.date}</p>
        <p>Kanał TV: ${result.parsed.tvChannel}</p>
        <p>Elementy: ${result.parsed.elements.join(', ') || 'brak'}</p>
        <a href="${result.url}" target="_blank" rel="noopener noreferrer">
          Oglądaj na YouTube
        </a>
      `;

      container.appendChild(card);
    });
  }

  renderPagination(totalPages, wrapper) {
    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    let paginationHTML = `
      <button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">
        &laquo; Poprzednia
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        paginationHTML += `
          <button ${i === this.currentPage ? 'class="active"' : ''} data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
    }

    paginationHTML += `
      <button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">
        Następna &raquo;
      </button>
    `;

    pagination.innerHTML = paginationHTML;

    pagination.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (button && !button.disabled) {
        this.currentPage = parseInt(button.dataset.page);
        this.render();
        window.scrollTo(0, 0);
      }
    });

    wrapper.appendChild(pagination);
  }

  setResults(results) {
    this.currentResults = results;
    this.currentPage = 1;
    this.render(results);
  }
}