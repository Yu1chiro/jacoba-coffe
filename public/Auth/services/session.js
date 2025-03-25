import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';

async function getFirebaseConfig() {
  try {
    const response = await fetch('/auth-config');
    if (!response.ok) throw new Error('Failed to load Firebase config');
    return response.json();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Gagal memuat konfigurasi Firebase');
  }
}

async function initializeFirebase() {
  const firebaseConfig = await getFirebaseConfig();
  return initializeApp(firebaseConfig);
}

async function login(email, password) {
  try {
    const app = await initializeFirebase();
    const auth = getAuth(app);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Dapatkan token ID untuk otentikasi server
    const idToken = await user.getIdToken();
    
    // Kirim token ke server untuk membuat sesi
    const response = await fetch('/sessionLogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      window.location.href = '/admin';
    } else {
      throw new Error('Login gagal');
    }
  } catch (error) {
    console.error('Error login:', error);
    throw error;
  }
}
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Inisialisasi Firebase
    const app = await initializeFirebase();
    const auth = getAuth(app);

    // Tambahkan event listener untuk button logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          // Tampilkan konfirmasi logout
          Swal.fire({
            title: 'Konfirmasi Logout',
            text: 'Apakah Anda yakin ingin keluar?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal'
          }).then(async (result) => {
            if (result.isConfirmed) {
              // Tampilkan loading
              Swal.fire({
                title: 'Logging out...',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                  Swal.showLoading();
                }
              });

              // Logout dari Firebase
              await auth.signOut();
              
              // Hapus session di server
              await fetch('/sessionLogout', { 
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              // Redirect ke halaman login
              Swal.fire({
                icon: 'success',
                title: 'Berhasil Logout',
                text: 'Anda telah berhasil keluar dari sistem.',
                showConfirmButton: false,
                timer: 1500
              }).then(() => {
                window.location.href = '/sign';
              });
            }
          });
        } catch (error) {
          console.error('Error saat logout:', error);
          Swal.fire({
            icon: 'error',
            title: 'Logout Gagal',
            text: 'Terjadi kesalahan saat mencoba logout. Silakan coba lagi.'
          });
        }
      });
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
});

async function logout() {
  try {
    await fetch('/sessionLogout', { method: 'POST' });
    window.location.href = '/sign';
  } catch (error) {
    console.error('Error logout:', error);
  }
}

export { login, logout };