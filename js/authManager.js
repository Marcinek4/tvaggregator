export class AuthManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupSuperAdmin();
    this.setupAuthUI();
  }

  setupSuperAdmin() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (!users.some(user => user.role === 'admin')) {
      // Create superadmin if it doesn't exist
      const superadmin = {
        username: 'admin',
        passwordHash: this.hashPassword('admin123'), // Default password
        role: 'admin',
        approved: true
      };
      users.push(superadmin);
      localStorage.setItem('users', JSON.stringify(users));
    }
  }

  setupAuthUI() {
    const authStatus = document.getElementById('auth-status');
    const adminLinks = document.getElementById('admin-links');
    
    if (authStatus) {
      const currentUser = this.getCurrentUser();
      
      if (currentUser) {
        authStatus.innerHTML = `
          <div class="auth-info">
            <span>Zalogowany jako: ${currentUser.username}</span>
            <button onclick="authManager.logout()">Wyloguj</button>
          </div>
        `;
        
        if ((currentUser.role === 'admin' || currentUser.role === 'moderator') && adminLinks) {
          adminLinks.innerHTML = `
            <a href="channels.html">Zarządzanie kanałami</a>
            ${currentUser.role === 'admin' ? '<a href="admin.html">Panel administratora</a>' : ''}
          `;
        }
      } else {
        authStatus.innerHTML = `
          <div class="auth-controls">
            <button onclick="authManager.showLoginForm()">Zaloguj</button>
            <button onclick="authManager.showRegisterForm()">Zarejestruj</button>
          </div>
        `;
      }
    }
  }

  hashPassword(password) {
    // In a real application, use a proper hashing library
    // This is a simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  async login(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => 
      u.username === username && 
      u.passwordHash === this.hashPassword(password) &&
      u.approved
    );

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify({
        username: user.username,
        role: user.role
      }));
      this.setupAuthUI();
      document.getElementById('login-modal')?.remove();
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.setupAuthUI();
    window.location.href = 'index.html';
  }

  async register(username, password) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.some(u => u.username === username)) {
      throw new Error('Nazwa użytkownika jest już zajęta');
    }

    const newUser = {
      username,
      passwordHash: this.hashPassword(password),
      role: 'user',
      approved: false,
      registrationDate: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return true;
  }

  getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }

  getCurrentUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  async checkAuthStatus() {
    const user = this.getCurrentUser();
    this.setupAuthUI();
    return user;
  }

  showLoginForm() {
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.innerHTML = `
      <div class="auth-modal">
        <h2>Logowanie</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="username">Nazwa użytkownika:</label>
            <input type="text" id="username" required>
          </div>
          <div class="form-group">
            <label for="password">Hasło:</label>
            <input type="password" id="password" required>
          </div>
          <div id="login-error" class="error-message"></div>
          <button type="submit">Zaloguj</button>
          <button type="button" onclick="this.closest('#login-modal').remove()">
            Anuluj
          </button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const success = await this.login(username, password);
        if (!success) {
          document.getElementById('login-error').textContent = 
            'Nieprawidłowe dane logowania lub konto nie zostało zatwierdzone';
        }
      } catch (error) {
        document.getElementById('login-error').textContent = error.message;
      }
    });
  }

  showRegisterForm() {
    const modal = document.createElement('div');
    modal.id = 'register-modal';
    modal.innerHTML = `
      <div class="auth-modal">
        <h2>Rejestracja</h2>
        <form id="register-form">
          <div class="form-group">
            <label for="reg-username">Nazwa użytkownika:</label>
            <input type="text" id="reg-username" required>
          </div>
          <div class="form-group">
            <label for="reg-password">Hasło:</label>
            <input type="password" id="reg-password" required>
          </div>
          <div class="form-group">
            <label for="reg-password-confirm">Potwierdź hasło:</label>
            <input type="password" id="reg-password-confirm" required>
          </div>
          <div id="register-error" class="error-message"></div>
          <button type="submit">Zarejestruj</button>
          <button type="button" onclick="this.closest('#register-modal').remove()">
            Anuluj
          </button>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
      const passwordConfirm = document.getElementById('reg-password-confirm').value;
      
      if (password !== passwordConfirm) {
        document.getElementById('register-error').textContent = 
          'Hasła nie są identyczne';
        return;
      }
      
      try {
        await this.register(username, password);
        modal.remove();
        alert('Konto zostało utworzone. Poczekaj na zatwierdzenie przez administratora.');
      } catch (error) {
        document.getElementById('register-error').textContent = error.message;
      }
    });
  }
}

// Make authManager globally available
window.authManager = new AuthManager();