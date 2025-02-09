import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

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

async function checkAdminRole(user, db) {
  if (!user) return false;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.role === 'admin';  // Pastikan Firestore menyimpan role sebagai "admin"
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
  }

  return false;
}

async function handleAuthRedirect(user, db) {
  const currentPath = getCurrentPath();

  if (user) {
    sessionStorage.setItem('isLoggedIn', 'true');
    
    const isAdmin = await checkAdminRole(user, db);
    if (!isAdmin) {
      alert('Akses ditolak: Anda bukan admin!');
      signOut(getAuth());
      return;
    }

    if (currentPath === '/Auth/sign.html') {
      window.location.href = '/Dashboard/admin.html';
      return;
    }

    if (!currentPath.startsWith('/Dashboard/')) {
      window.location.href = '/Dashboard/admin.html';
      return;
    }
  } else {
    sessionStorage.removeItem('isLoggedIn');
    if (currentPath !== '/Auth/sign.html') {
      window.location.href = '/Auth/sign.html';
    }
  }
}

getFirebaseConfig().then(firebaseConfig => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  onAuthStateChanged(auth, (user) => {
    handleAuthRedirect(user, db);

    const content = document.getElementById('content');
    const hide = document.getElementById('hide-element');

    if (user && content && hide) {
      const updateDisplay = () => {
        if (window.innerWidth < 768) {
          content.style.display = 'none';
          hide.style.display = 'block';
        } else {
          content.style.display = 'block';
          hide.style.display = 'block';
        }
      };

      updateDisplay();
      window.addEventListener('resize', updateDisplay);
    }
  });

  const logoutButton = document.getElementById('logout-session');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      signOut(auth)
        .then(() => {
          sessionStorage.removeItem('isLoggedIn');
          window.location.href = '/Auth/sign.html';
        })
        .catch((error) => {
          console.error('Logout error:', error);
        });
    });
  }
});
