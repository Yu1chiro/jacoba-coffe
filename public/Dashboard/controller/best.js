// Import library Firebase yang dibutuhkan
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, set, push, get, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

// Fungsi untuk mendapatkan konfigurasi Firebase dari server
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

// Inisialisasi Firebase
getFirebaseConfig().then(firebaseConfig => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  const bestsellerRef = ref(database, 'best-seller');

  // Fungsi untuk menambahkan produk bestseller
  function addBestsellerProduct(productData) {
    const newProductRef = push(bestsellerRef);
    return set(newProductRef, productData);
  }

  // Event listener untuk tombol "Tambah Produk"
  document.getElementById('add-bestseller').addEventListener('click', function () {
    Swal.fire({
      title: 'Tambah Produk Bestseller',
      html: `
        <form id="bestseller-product" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md text-start">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Nama Produk</label>
            <input type="text" id="best-name" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan nama produk">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Thumbnail Produk</label>
            <input type="file" id="best-thumbnail" class="w-full px-4 py-2 border rounded-lg" accept="image/*">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Kategori</label>
            <select id="best-category" class="w-full px-4 py-2 border rounded-lg">
              <option value="">Pilih Kategori</option>
              <option value="Makanan">Makanan</option>
              <option value="Snack">Snack</option>
              <option value="Minuman">Minuman</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Varian</label>
            <input type="text" id="best-variant" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan varian">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Harga</label>
            <input type="number" id="best-price" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan harga">
          </div>
          <button type="submit" id="best-submit" class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg">Tambah Produk</button>
        </form>
      `,
      showConfirmButton: false,
      didOpen: () => {
        document.getElementById('bestseller-product').addEventListener('submit', async function (e) {
          e.preventDefault();
          try {
            const name = document.getElementById('best-name').value;
            const thumbnail = document.getElementById('best-thumbnail').files[0];
            const category = document.getElementById('best-category').value;
            const variant = document.getElementById('best-variant').value;
            const price = document.getElementById('best-price').value;

            if (!name || !thumbnail || !category || !price) {
              throw new Error('Mohon lengkapi semua field');
            }

            const base64Thumbnail = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(thumbnail);
            });

            const productData = {
              name,
              thumbnail: base64Thumbnail,
              category,
              variant: variant || null,
              price: parseFloat(price)
            };

            await addBestsellerProduct(productData);

            Swal.fire({
              icon: 'success',
              title: 'Berhasil',
              text: 'Produk berhasil ditambahkan!'
            });

            loadBestsellerProducts();
          } catch (error) {
            Swal.fire({
              icon: 'error',
              title: 'Gagal',
              text: error.message || 'Terjadi kesalahan saat menambahkan produk'
            });
          }
        });
      }
    });
  });

  // Fungsi untuk mengedit produk bestseller
  function editBestsellerProduct(productId, productData) {
    const productRef = ref(database, `best-seller/${productId}`);
    return update(productRef, productData);
  }

  // Fungsi untuk menampilkan form edit produk
  function editBestsellerProductPrompt(productId, productData) {
    Swal.fire({
        title: 'Edit Produk Bestseller',
        html: `
        <div class="text-start space-y-4">
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-1">Nama Produk</label>
        <input type="text" id="edit-name" class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" value="${productData.name}" placeholder="Nama Produk">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-1">Kategori</label>
        <input type="text" id="edit-category" class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" value="${productData.category}" placeholder="Kategori">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-1">Varian</label>
        <input type="text" id="edit-variant" class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" value="${productData.variant || ''}" placeholder="Varian">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 font-medium mb-1">Harga</label>
        <input type="number" id="edit-price" class="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500" value="${productData.price}" placeholder="Harga">
      </div>
    </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        customClass: {
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700',
          cancelButton: 'bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500'
        },
      preConfirm: () => {
        const newName = document.getElementById('edit-name').value;
        const newCategory = document.getElementById('edit-category').value;
        const newVariant = document.getElementById('edit-variant').value;
        const newPrice = document.getElementById('edit-price').value;

        if (!newName || !newCategory || !newPrice) {
          Swal.showValidationMessage('Mohon lengkapi semua field yang diperlukan');
          return false;
        }

        return editBestsellerProduct(productId, {
          name: newName,
          category: newCategory,
          variant: newVariant || null,
          price: parseFloat(newPrice)
        });
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Produk berhasil diperbarui!'
        });
        loadBestsellerProducts();
      }
    });
  }

  // Fungsi untuk memuat ulang daftar bestseller
  function loadBestsellerProducts() {
    onValue(bestsellerRef, (snapshot) => {
      const bestsellers = snapshot.val();
      const bestsellersListElement = document.getElementById('bestseller-list');
      bestsellersListElement.innerHTML = '';

      if (bestsellers) {
        Object.entries(bestsellers).forEach(([productId, product]) => {
          const row = document.createElement('tr');
          row.className = 'border-b hover:bg-gray-100 transition duration-300';
          row.innerHTML = `
            <td class="w-1/3 text-center py-3 px-4">${product.name}</td>
            <td class="w-1/3 text-center py-3 px-4">
              <img src="${product.thumbnail}" alt="${product.name}" class="w-20 h-20 object-cover mx-auto rounded">
            </td>
            <td class="text-center py-3 px-4">${product.category}</td>
            <td class="text-center py-3 px-4">${product.variant || '-'}</td>
            <td class="text-center py-3 px-4">Rp ${product.price.toLocaleString('id-ID')}</td>
            <td class="text-center py-3 px-4">
            <button onclick="editBestsellerProductPrompt('${productId}', JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(product))}')))"
                class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition duration-300">Edit</button>

              <button onclick="deleteBestsellerProduct('${productId}')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300">Hapus</button>
            </td>
          `;
          bestsellersListElement.appendChild(row);
        });
      } else {
        bestsellersListElement.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">Tidak ada produk bestseller</td></tr>`;
      }
    });
  }

  // Fungsi untuk menghapus produk bestseller
  function deleteBestsellerProduct(productId) {
    const productRef = ref(database, `best-seller/${productId}`);
    remove(productRef).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Produk berhasil dihapus!'
      });
      loadBestsellerProducts();
    }).catch(error => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: error.message || 'Terjadi kesalahan saat menghapus produk'
      });
    });
  }

  // Ekspos fungsi ke global scope
  window.editBestsellerProductPrompt = editBestsellerProductPrompt;
  window.deleteBestsellerProduct = deleteBestsellerProduct;

  // Panggil fungsi untuk memuat produk bestseller
  loadBestsellerProducts();
});