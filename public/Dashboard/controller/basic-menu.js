// Import library Firebase yang dibutuhkan
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, set, push, get, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

// Fungsi untuk mendapatkan konfigurasi Firebase dari server
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

// Inisialisasi Firebase
// Inisialisasi Firebase
getFirebaseConfig().then(firebaseConfig => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  // Reference untuk basic
  const basicRef = ref(database, 'basic-product');

  // Fungsi untuk menambahkan produk basic
  async function addbasicProduct(productData) {
    try {
      const newProductRef = push(basicRef);
      const productId = newProductRef.key;
      
      const enhancedProductData = {
        ...productData,
        id: productId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await set(newProductRef, enhancedProductData);
      return productId;
    } catch (error) {
      console.error("Error adding product:", error);
      throw error;
    }
  }

  // Fungsi untuk mengekstrak ID dari link Google Drive
  function extractGoogleDriveId(url) {
    const regex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match && match[1] ? match[1] : null;
  }

  // Event listener untuk tombol "Tambah Produk"
  document.getElementById('add-basic').addEventListener('click', function() {
    Swal.fire({
      title: 'Add Jacoba Menu',
      html: `
        <form id="basic-product" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md text-start">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Nama Produk</label>
            <input type="text" id="basic-name" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan nama produk" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Thumbnail Produk (Google Drive Link)</label>
            <input type="text" id="basic-thumbnail" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan link Google Drive" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Kategori</label>
            <select id="basic-category" class="w-full px-4 py-2 border rounded-lg" required>
              <option value="">Pilih Kategori</option>
              <option value="Makanan">Makanan</option>
              <option value="Snack">Snack</option>
              <option value="Minuman">Minuman</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Varian</label>
            <input type="text" id="basic-variant" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan varian">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Harga</label>
            <input type="number" id="basic-price" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan harga" required>
          </div>
          <button type="submit" class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Tambah Produk</button>
        </form>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        const form = document.getElementById('basic-product');
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          try {
            const name = document.getElementById('basic-name').value;
            const thumbnailLink = document.getElementById('basic-thumbnail').value;
            const category = document.getElementById('basic-category').value;
            const variant = document.getElementById('basic-variant').value;
            const price = document.getElementById('basic-price').value;

            if (!name || !thumbnailLink || !category || !price) {
              throw new Error('Mohon lengkapi semua field yang diperlukan');
            }

            const thumbnailId = extractGoogleDriveId(thumbnailLink);
            if (!thumbnailId) {
              throw new Error('Link Google Drive tidak valid');
            }

            const productData = {
              name,
              thumbnail: thumbnailId,
              category,
              variant: variant || null,
              price: parseFloat(price)
            };

            await addbasicProduct(productData);
            
            Swal.fire({
              icon: 'success',
              title: 'Berhasil',
              text: 'Produk berhasil ditambahkan!'
            });

            loadbasicProducts();
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

  // Fungsi untuk mengedit produk
  async function editbasicProduct(productId, productData) {
    try {
      const productRef = ref(database, `basic-product/${productId}`);
      const updatedData = {
        ...productData,
        updatedAt: new Date().toISOString()
      };
      await update(productRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  // Fungsi untuk menampilkan form edit
  async function editbasicProductPrompt(productId, productData) {
    Swal.fire({
      title: 'Edit Produk basic',
      html: `
        <form id="edit-basic-form" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md text-start">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Nama Produk</label>
            <input type="text" id="edit-name" class="w-full px-4 py-2 border rounded-lg" value="${productData.name}" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Thumbnail</label>
            <input type="link" id="edit-thumbnail" class="w-full px-4 py-2 border rounded-lg" value="${productData.name}" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Kategori</label>
            <select id="edit-category" class="w-full px-4 py-2 border rounded-lg" required>
              <option value="Makanan" ${productData.category === 'Makanan' ? 'selected' : ''}>Makanan</option>
              <option value="Snack" ${productData.category === 'Snack' ? 'selected' : ''}>Snack</option>
              <option value="Minuman" ${productData.category === 'Minuman' ? 'selected' : ''}>Minuman</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Varian</label>
            <input type="text" id="edit-variant" class="w-full px-4 py-2 border rounded-lg" value="${productData.variant || ''}">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Harga</label>
            <input type="number" id="edit-price" class="w-full px-4 py-2 border rounded-lg" value="${productData.price}" required>
          </div>
        </form>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      preConfirm: async () => {
        try {
          const newName = document.getElementById('edit-name').value;
          const newthumbnailLink = document.getElementById('edit-thumbnail').value;
          const newCategory = document.getElementById('edit-category').value;
          const newVariant = document.getElementById('edit-variant').value;
          const newPrice = document.getElementById('edit-price').value;

          if (!newName || !newthumbnailLink || !newCategory || !newPrice) {
            Swal.showValidationMessage('Mohon lengkapi semua field yang diperlukan');
            return false;
          }
          const thumbnailId = extractGoogleDriveId(newthumbnailLink);
            if (!thumbnailId) {
              throw new Error('Link Google Drive tidak valid');
            }

          const updatedData = {
            ...productData,
            name: newName,
            thumbnail: thumbnailId,
            category: newCategory,
            variant: newVariant || null,
            price: parseFloat(newPrice)
          };

          await editbasicProduct(productId, updatedData);
          return true;
        } catch (error) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil',
          text: 'Produk berhasil diperbarui!'
        });
        loadbasicProducts();
      }
    });
  }

  // Fungsi untuk menghapus produk
  async function deletebasicProduct(productId) {
    try {
      Swal.fire({
        title: 'Apakah Anda yakin?',
        text: "Produk yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
      }).then(async (result) => {
        if (result.isConfirmed) {
          const productRef = ref(database, `basic-product/${productId}`);
          await remove(productRef);
          
          Swal.fire(
            'Terhapus!',
            'Produk berhasil dihapus.',
            'success'
          );
          
          loadbasicProducts();
        }
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan saat menghapus produk'
      });
    }
  }

  // Fungsi untuk memuat dan menampilkan data
  function loadbasicProducts() {
    onValue(basicRef, (snapshot) => {
      const basics = snapshot.val();
      const basicsListElement = document.getElementById('basic-list');
      basicsListElement.innerHTML = '';

      if (basics) {
        const basicsArray = Object.entries(basics)
          .map(([key, value]) => ({ id: key, ...value }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        basicsArray.forEach(product => {
          const row = document.createElement('tr');
          row.className = 'border-b hover:bg-gray-100 transition duration-300';
          row.innerHTML = `
            <td class="w-1/3 text-center py-3 px-4">${product.name}</td>
            <td class="w-1/3 text-center py-3 px-4">
              <img src="/asset/${product.thumbnail}" alt="${product.name}" class="w-20 h-20 object-cover mx-auto rounded">
            </td>
            <td class="text-center py-3 px-4">${product.category}</td>
            <td class="text-center py-3 px-4">${product.variant || '-'}</td>
            <td class="text-center py-3 px-4">Rp ${product.price.toLocaleString('id-ID')}</td>
            <td class="text-center py-3 px-4">
              <button 
                onclick="window.editbasicProductPrompt('${product.id}', ${JSON.stringify(product).replace(/"/g, '&quot;')})"
                class="bg-green-500 text-white mb-2 px-3 py-1 rounded hover:bg-green-600 transition duration-300 mr-2">
                Edit
              </button>
              <button 
                onclick="window.deletebasicProduct('${product.id}')"
                class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300">
                Hapus
              </button>
            </td>
          `;
          basicsListElement.appendChild(row);
        });
      } else {
        basicsListElement.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-gray-500">
              Tidak ada produk basic
            </td>
          </tr>
        `;
      }
    });
  }

  // Ekspos fungsi ke global scope
  window.editbasicProductPrompt = editbasicProductPrompt;
  window.deletebasicProduct = deletebasicProduct;

  // Panggil fungsi untuk memuat produk basic
  loadbasicProducts();
});