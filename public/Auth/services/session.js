import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

async function getFirebaseConfig() {
  try {
    const response = await fetch('/firebase-config');
    if (!response.ok) throw new Error('Failed to load Firebase config');
    return response.json();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Gagal memuat konfigurasi Firebase');
  }
}

function getCurrentPath() {
  return window.location.pathname;
}

async function checkAdminRole(user, database) {
  try {
    if (!user?.uid) return false;
    
    const adminRef = ref(database, `admin/${user.uid}`);
    const snapshot = await get(adminRef);
    
    if (!snapshot.exists()) {
      console.warn('User tidak ditemukan di database admin');
      return false;
    }
    
    const adminData = snapshot.val();
    return adminData?.role === 'admin';
  } catch (error) {
    console.error('Error saat memeriksa role admin:', error);
    return false;
  }
}

async function redirectBasedOnAuth(user, database) {
  const currentPath = getCurrentPath();
  const isAuthPage = currentPath === '/Auth/sign.html';
  const isDashboardPage = currentPath.startsWith('/Dashboard/');

  try {
    if (!user) {
      sessionStorage.removeItem('isLoggedIn');
      if (!isAuthPage) {
        window.location.href = '/Auth/sign.html';
      }
      return;
    }

    const isAdmin = await checkAdminRole(user, database);
    
    if (!isAdmin) {
      await signOut(getAuth());
      sessionStorage.removeItem('isLoggedIn');
      window.location.href = '/Auth/sign.html';
      return;
    }

    sessionStorage.setItem('isLoggedIn', 'true');
    
    if (isAuthPage || !isDashboardPage) {
      window.location.href = '/Dashboard/admin.html';
    }
  } catch (error) {
    console.error('Error dalam proses redirect:', error);
    window.location.href = '/Auth/sign.html';
  }
}

function initializeUIElements(user) {
  const content = document.getElementById('content');
  const hide = document.getElementById('hide-element');

  if (!content || !hide) return;

  const updateDisplay = () => {
    const isMobile = window.innerWidth < 768;
    content.style.display = user && !isMobile ? 'block' : 'none';
    hide.style.display = user ? 'block' : 'none';
  };

  updateDisplay();
  window.addEventListener('resize', updateDisplay);
}

function setupLogoutHandler(auth) {
  const logoutButton = document.getElementById('logout-session');
  if (!logoutButton) return;

  logoutButton.addEventListener('click', async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('isLoggedIn');
      window.location.href = '/Auth/sign.html';
    } catch (error) {
      console.error('Error saat logout:', error);
    }
  });
}

// Inisialisasi aplikasi
getFirebaseConfig().then(firebaseConfig => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  onAuthStateChanged(auth, async (user) => {
    await redirectBasedOnAuth(user, database);
    initializeUIElements(user);
  });

  setupLogoutHandler(auth);
}).catch(error => {
  console.error('Error saat inisialisasi aplikasi:', error);
  window.location.href = '/Auth/sign.html';
});