export class AdminPanel {
  constructor() {
    this.init();
  }

  init() {
    this.renderPendingUsers();
    this.renderAllUsers();
    this.renderManagementControls();
  }

  renderPendingUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const pendingUsers = users.filter(user => !user.approved && user.role !== 'admin');
    const container = document.getElementById('pending-users-list');
    
    if (!pendingUsers.length) {
      container.innerHTML = '<p>Brak oczekujących kont</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nazwa użytkownika</th>
            <th>Data rejestracji</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          ${pendingUsers.map(user => `
            <tr>
              <td>${user.username}</td>
              <td>${new Date(user.registrationDate).toLocaleString('pl-PL')}</td>
              <td>
                <button onclick="adminPanel.approveUser('${user.username}')">
                  Zatwierdź
                </button>
                <button onclick="adminPanel.rejectUser('${user.username}')" 
                        class="danger-button">
                  Odrzuć
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderAllUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const container = document.getElementById('users-list');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nazwa użytkownika</th>
            <th>Rola</th>
            <th>Status</th>
            <th>Data rejestracji</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${user.username}</td>
              <td>
                ${user.role === 'admin' ? 'Administrator' :
                  `<select onchange="adminPanel.changeUserRole('${user.username}', this.value)"
                          ${user.username === currentUser.username ? 'disabled' : ''}>
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>Użytkownik</option>
                    <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                  </select>`
                }
              </td>
              <td>${user.approved ? 'Zatwierdzone' : 'Oczekujące'}</td>
              <td>${new Date(user.registrationDate).toLocaleString('pl-PL')}</td>
              <td>
                ${user.role !== 'admin' ? `
                  <button onclick="adminPanel.deleteUser('${user.username}')"
                          class="danger-button">
                    Usuń
                  </button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderManagementControls() {
    const existingControls = document.querySelector('.management-controls');
    if (!existingControls) {
      const controlsSection = document.createElement('section');
      controlsSection.innerHTML = `
        <h3>Zarządzanie systemem</h3>
        <div class="management-controls">
          <button onclick="adminPanel.clearAllVideos()" class="danger-button">
            Usuń wszystkie filmy
          </button>
        </div>
      `;
      document.getElementById('admin-panel').appendChild(controlsSection);
    }
  }

  approveUser(username) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
      users[userIndex].approved = true;
      localStorage.setItem('users', JSON.stringify(users));
      this.renderPendingUsers();
      this.renderAllUsers();
    }
  }

  rejectUser(username) {
    if (confirm(`Czy na pewno chcesz odrzucić konto użytkownika ${username}?`)) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const filteredUsers = users.filter(u => u.username !== username);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
      this.renderPendingUsers();
      this.renderAllUsers();
    }
  }

  deleteUser(username) {
    if (confirm(`Czy na pewno chcesz usunąć konto użytkownika ${username}?`)) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const filteredUsers = users.filter(u => u.username !== username);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
      this.renderAllUsers();
    }
  }

  changeUserRole(username, newRole) {
    if (confirm(`Czy na pewno chcesz zmienić rolę użytkownika ${username} na ${newRole}?`)) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex(u => u.username === username);
      
      if (userIndex !== -1) {
        users[userIndex].role = newRole;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update current user's role in session if it's the same user
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username === username) {
          currentUser.role = newRole;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          // Refresh auth UI
          window.authManager.setupAuthUI();
        }
        
        this.renderAllUsers();
      }
    }
  }

  clearAllVideos() {
    if (confirm('Czy na pewno chcesz usunąć wszystkie filmy? Tej operacji nie można cofnąć.')) {
      localStorage.removeItem('videos');
      alert('Wszystkie filmy zostały usunięte');
    }
  }
}

// Make adminPanel globally available
window.adminPanel = new AdminPanel();