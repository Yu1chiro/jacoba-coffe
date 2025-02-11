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
getFirebaseConfig().then(firebaseConfig => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  // Reference untuk week
  const weekRef = ref(database, 'week-product');

  // Fungsi untuk mengompres gambar
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxWidth = 800;
          const maxHeight = 800;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        
        img.onerror = reject;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Fungsi untuk menambahkan produk week
  async function addweekProduct(productData) {
    try {
      const newProductRef = push(weekRef);
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

  // Event listener untuk tombol "Tambah Produk"
  document.getElementById('add-week').addEventListener('click', function() {
    Swal.fire({
      title: 'Add List Week Menu',
      html: `
        <form id="week-product" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md text-start">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Nama Produk</label>
            <input type="text" id="week-name" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan nama produk" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Thumbnail Produk</label>
            <input type="file" id="week-thumbnail" class="w-full px-4 py-2 border rounded-lg" accept="image/*" required>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Kategori</label>
            <select id="week-category" class="w-full px-4 py-2 border rounded-lg" required>
              <option value="">Pilih Kategori</option>
              <option value="Makanan">Makanan</option>
              <option value="Snack">Snack</option>
              <option value="Minuman">Minuman</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Varian</label>
            <input type="text" id="week-variant" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan varian">
          </div>
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Harga</label>
            <input type="number" id="week-price" class="w-full px-4 py-2 border rounded-lg" placeholder="Masukkan harga" required>
          </div>
          <button type="submit" class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Tambah Produk</button>
        </form>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        const form = document.getElementById('week-product');
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          try {
            const name = document.getElementById('week-name').value;
            const thumbnail = document.getElementById('week-thumbnail').files[0];
            const category = document.getElementById('week-category').value;
            const variant = document.getElementById('week-variant').value;
            const price = document.getElementById('week-price').value;

            if (!name || !thumbnail || !category || !price) {
              throw new Error('Mohon lengkapi semua field yang diperlukan');
            }

            const compressedThumbnail = await compressImage(thumbnail);
            
            const productData = {
              name,
              thumbnail: compressedThumbnail,
              category,
              variant: variant || null,
              price: parseFloat(price)
            };

            await addweekProduct(productData);
            
            Swal.fire({
              icon: 'success',
              title: 'Berhasil',
              text: 'Produk berhasil ditambahkan!'
            });

            loadweekProducts();
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
  async function editweekProduct(productId, productData) {
    try {
      const productRef = ref(database, `week-product/${productId}`);
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
  async function editweekProductPrompt(productId, productData) {
    Swal.fire({
      title: 'Edit Produk week',
      html: `
        <form id="edit-week-form" class="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md text-start">
          <div class="mb-4">
            <label class="block text-gray-700 font-medium mb-2">Nama Produk</label>
            <input type="text" id="edit-name" class="w-full px-4 py-2 border rounded-lg" value="${productData.name}" required>
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
          const newCategory = document.getElementById('edit-category').value;
          const newVariant = document.getElementById('edit-variant').value;
          const newPrice = document.getElementById('edit-price').value;

          if (!newName || !newCategory || !newPrice) {
            Swal.showValidationMessage('Mohon lengkapi semua field yang diperlukan');
            return false;
          }

          const updatedData = {
            ...productData,
            name: newName,
            category: newCategory,
            variant: newVariant || null,
            price: parseFloat(newPrice)
          };

          await editweekProduct(productId, updatedData);
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
        loadweekProducts();
      }
    });
  }

  // Fungsi untuk menghapus produk
  async function deleteweekProduct(productId) {
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
          const productRef = ref(database, `week-product/${productId}`);
          await remove(productRef);
          
          Swal.fire(
            'Terhapus!',
            'Produk berhasil dihapus.',
            'success'
          );
          
          loadweekProducts();
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
  function loadweekProducts() {
    onValue(weekRef, (snapshot) => {
      const weeks = snapshot.val();
      const weeksListElement = document.getElementById('week-list');
      weeksListElement.innerHTML = '';

      if (weeks) {
        const weeksArray = Object.entries(weeks)
          .map(([key, value]) => ({ id: key, ...value }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        weeksArray.forEach(product => {
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
              <button 
                onclick="window.editweekProductPrompt('${product.id}', ${JSON.stringify(product).replace(/"/g, '&quot;')})"
                class="bg-green-500 text-white mb-2 px-3 py-1 rounded hover:bg-green-600 transition duration-300 mr-2">
                Edit
              </button>
              <button 
                onclick="window.deleteweekProduct('${product.id}')"
                class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300">
                Hapus
              </button>
            </td>
          `;
          weeksListElement.appendChild(row);
        });
      } else {
        weeksListElement.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-gray-500">
              Tidak ada produk week
            </td>
          </tr>
        `;
      }
    });
  }
  // Ekspos fungsi ke global scope
  window.editweekProductPrompt = editweekProductPrompt;
  window.deleteweekProduct = deleteweekProduct;

  // Panggil fungsi untuk memuat produk week
  loadweekProducts();
});