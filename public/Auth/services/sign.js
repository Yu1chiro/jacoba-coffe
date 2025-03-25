import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Mendapatkan konfigurasi Firebase dari server
async function getFirebaseConfig() {
  try {
    const response = await fetch('/firebase-config'); // Pastikan endpoint ini benar
    if (!response.ok) throw new Error('Failed to load Firebase config');
    return response.json();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Gagal memuat konfigurasi Firebase');
  }
}
getFirebaseConfig().then(firebaseConfig => {
  // Inisialisasi Firebase dengan konfigurasi dari server
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app); // Inisialisasi auth

  document.getElementById('login-check').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = document.getElementById('submit-button');
  
    try {
      // Tampilkan animasi loading
      Swal.fire({
        title: 'Authentication',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });
  
      // Cek apakah email dan password sudah diisi
      if (!email || !password) {
        throw new Error('Email dan password tidak boleh kosong');
      }
  
      // Login dengan Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Periksa apakah email pengguna telah diverifikasi
      if (!user.emailVerified) {
        Swal.close(); // Hentikan animasi loading
  
        // Tampilkan pesan untuk memverifikasi email terlebih dahulu
        Swal.fire({
          icon: 'warning',
          title: 'Email Belum Diverifikasi',
          text: 'Silakan periksa email Anda untuk memverifikasi akun sebelum login.',
          confirmButtonText: 'OK',
        });
  
        return; // Jangan izinkan login jika email belum diverifikasi
      }
  
      // Dapatkan token ID dari pengguna yang berhasil login
      const idToken = await user.getIdToken();
  
      // Kirim idToken ke server untuk membuat session cookie
      const sessionResponse = await fetch('/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
  
      // Tangani respons dari server
      if (!sessionResponse.ok) {
        // Jika status 429 (rate limit terlampaui)
        if (sessionResponse.status === 429) {
          const data = await sessionResponse.json();
          throw new Error(data.message); // Gunakan pesan dari server
        } else {
          throw new Error('Gagal membuat sesi');
        }
      }
      fetch('/firebase-config', {
        method: 'GET',
        credentials: 'include', // Pastikan cookie dikirim
      })
      .then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
  
      // Jika email telah diverifikasi dan session berhasil dibuat, arahkan ke Dashboard
      Swal.close(); // Hentikan animasi loading
  
      Swal.fire({
        icon: 'success',
        title: 'Login Verified!',
        html: 'redirecting.....',
        showConfirmButton: false,
        timer: 2000,
      }).then(() => {
        window.location.href = '/admin';
      });
    } catch (error) {
      // Hentikan animasi loading jika gagal login
      Swal.close();
  
      // Tampilkan pesan error
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message, // Tampilkan pesan error dari server atau Firebase
        confirmButtonText: 'Tutup',
      });
  
      // Jika error adalah auth/too-many-requests, nonaktifkan tombol submit dan tampilkan countdown
      if (error.code === 'auth/too-many-requests') {
        const countdownDuration = 60; // 1 menit dalam detik
        const countdownEndTime = Date.now() + countdownDuration * 1000;
  
        // Simpan waktu akhir countdown di localStorage
        localStorage.setItem('countdownEnd', countdownEndTime);
  
        // Mulai countdown
        startCountdown(submitButton, countdownDuration);
      }
    }
  });
  
  // Fungsi untuk memulai countdown
  function startCountdown(submitButton, duration) {
    submitButton.disabled = true;
    let timeLeft = duration;
  
    const interval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(interval);
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
        localStorage.removeItem('countdownEnd'); // Hapus countdown dari localStorage
      } else {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        submitButton.textContent = `Coba lagi dalam ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
    }, 1000);
  }
  
  // Cek localStorage saat halaman dimuat
  window.addEventListener('load', () => {
    const submitButton = document.getElementById('submit-button');
    const countdownEnd = localStorage.getItem('countdownEnd');
  
    if (countdownEnd) {
      const remainingTime = Math.floor((countdownEnd - Date.now()) / 1000);
  
      if (remainingTime > 0) {
        // Jika countdown masih berjalan, lanjutkan countdown
        startCountdown(submitButton, remainingTime);
      } else {
        // Jika countdown sudah selesai, hapus dari localStorage
        localStorage.removeItem('countdownEnd');
      }
    }
  });
});
