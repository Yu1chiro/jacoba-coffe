import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

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
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app); // Inisialisasi auth
  const database = getDatabase(app); // Inisialisasi database

  // Fungsi validasi form
  function validateForm(namaLengkap, email, password, konfirmasiPassword) {
    if (!namaLengkap || namaLengkap.length < 3) {
      throw new Error('Nama lengkap harus minimal 3 karakter');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Format email tidak valid');
    }

    if (password.length < 6) {
      throw new Error('Password harus minimal 6 karakter');
    }

    if (password !== konfirmasiPassword) {
      throw new Error('Konfirmasi password tidak cocok');
    }
  }

  // Fungsi untuk menyimpan data admin ke Firebase Realtime Database
  async function saveAdminData(uid, namaLengkap, email) {
    const adminRef = ref(database, `admin/${uid}`);
    await set(adminRef, {
      namaLengkap,
      email,
      createdAt: new Date().toISOString(),
      role: 'admin'
    });
  }

  // Fungsi untuk mengirim email verifikasi
  async function sendVerificationEmail(user) {
    try {
      await sendEmailVerification(user);
      Swal.fire({
        icon: 'info',
        title: 'Email Verifikasi Dikirim',
        text: 'Periksa email Anda untuk memverifikasi akun.',
        confirmButtonText: 'OK'
      });
    } catch (error) {
      console.error('Gagal mengirim email verifikasi:', error);
      throw new Error('Gagal mengirim email verifikasi.');
    }
  }

  // Penanganan pengiriman form
  document.getElementById('regist-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Ambil nilai form
    const namaLengkap = document.getElementById('nama-lengkap').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const konfirmasiPassword = document.getElementById('konfirmasi-password').value;
    
    try {
      // Validasi form
      validateForm(namaLengkap, email, password, konfirmasiPassword);
      
      // Tampilkan animasi loading menggunakan SweetAlert
      Swal.fire({
        title: 'Memproses Pendaftaran',
        text: 'Tunggu sebentar...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Buat user di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Simpan data admin tambahan ke Realtime Database
      await saveAdminData(userCredential.user.uid, namaLengkap, email);
      
      // Kirim email verifikasi
      await sendVerificationEmail(userCredential.user);
      
      // Tampilkan pesan sukses
      await Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil!',
        text: 'Email verifikasi telah dikirim. Periksa email Anda.',
        timer: 3000,
        showConfirmButton: false
      });
      
      // Arahkan ke halaman login
      window.location.href = '/Auth/sign.html';
      
    } catch (error) {
      // Tampilkan pesan error
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mendaftar',
        text: error.message,
        confirmButtonText: 'Tutup'
      });
    }
  });
});
