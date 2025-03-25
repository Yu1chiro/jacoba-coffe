import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const auth = getAuth();

// Fungsi untuk memeriksa session user
function checkSession() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        reject(new Error('User not logged in'));
      }
    });
  });
}

// Fungsi untuk menampilkan SweetAlert dan meminta login
function showLoginAlert() {
  Swal.fire({
    title: 'Silakan Login',
    text: 'Anda harus login menggunakan Google untuk melanjutkan pembelian.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Login dengan Google',
    cancelButtonText: 'Nanti saja',
    customClass: {
      confirmButton: 'swal2-confirm',
      cancelButton: 'swal2-cancel'
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Panggil fungsi signInWithGoogle jika pengguna memilih login
      signInWithGoogle();
    } else {
      // Tampilkan pesan jika pengguna memilih "Nanti saja"
      Swal.fire({
        title: 'Pembelian Dibatalkan',
        text: 'Anda dapat melanjutkan pembelian kapan saja.',
        icon: 'info',
        confirmButtonText: 'OK'
      });
    }
  });
}

// Fungsi untuk mengarahkan ke halaman checkout jika session valid
async function redirectToCheckout() {
  try {
    const user = await checkSession();
    window.location.href = '/checkout';
  } catch (error) {
    console.error('User not logged in:', error);
    showLoginAlert(); // Tampilkan SweetAlert jika pengguna belum login
  }
}
// Fungsi untuk proses sign in
async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Sign-in successful:", result.user);
  
      // Dapatkan ID token dari hasil login
      const idToken = await result.user.getIdToken();
  
      // Kirim ID token ke server untuk membuat session cookie
      const response = await fetch('/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
  
      if (response.ok) {
        // Redirect ke halaman checkout setelah login berhasil
        window.location.href = '/checkout';
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      Swal.fire({
        title: 'Login Gagal',
        text: 'Terjadi kesalahan saat mencoba login. Silakan coba lagi.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }
// Panggil fungsi redirectToCheckout saat halaman dimuat
document.addEventListener('DOMContentLoaded', redirectToCheckout);