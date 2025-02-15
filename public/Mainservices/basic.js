import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, onValue, set, push, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

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
  const provider = new GoogleAuthProvider();
  
  // Tambahan konfigurasi untuk provider
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  // Fungsi untuk proses sign in
  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Sign-in successful:", result.user);
      return result.user;
    } catch (error) {
      console.error("Sign-in error:", error);
      throw error;
    }
  }

  // Fungsi untuk menampilkan form checkout
 

 // Fungsi untuk menambah/mengurangi kuantitas produk
async function updateProductQuantity(userId, productId, change) {
    const itemRef = ref(database, `customers/${userId}/cart/${productId}`);
    const snapshot = await get(itemRef);
    
    if (snapshot.exists()) {
      const currentItem = snapshot.val();
      const newQuantity = Math.max(0, currentItem.quantity + change);
      
      if (newQuantity === 0) {
        // Hapus item jika kuantitas 0
        await set(itemRef, null);
      } else {
        await set(itemRef, {
          ...currentItem,
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        });
      }
      return true;
    }
    return false;
  }
  
  // Fungsi untuk menambahkan ke keranjang yang ditingkatkan
  async function addToCart(userId, product) {
    try {
      const customerCartRef = ref(database, `customers/${userId}/cart`);
      const cartSnapshot = await get(customerCartRef);
      
      if (cartSnapshot.exists()) {
        let existingProductKey = null;
        cartSnapshot.forEach((childSnapshot) => {
          const item = childSnapshot.val();
          if (item.id === product.id) {
            existingProductKey = childSnapshot.key;
          }
        });
        
        if (existingProductKey) {
          // Gunakan updateProductQuantity dengan quantity dari product
          await updateProductQuantity(userId, existingProductKey, product.quantity);
        } else {
          await push(customerCartRef, {
            ...product,
            quantity: product.quantity || 1,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        await push(customerCartRef, {
          ...product,
          quantity: product.quantity || 1,
          createdAt: new Date().toISOString()
        });
      }
      
      updateCartBadge(userId);
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }
  
  // Fungsi updateProductQuantity tetap sama
  async function updateProductQuantity(userId, productId, change) {
    const itemRef = ref(database, `customers/${userId}/cart/${productId}`);
    const snapshot = await get(itemRef);
    
    if (snapshot.exists()) {
      const currentItem = snapshot.val();
      const newQuantity = typeof change === 'number' 
        ? change  // Jika change adalah angka, gunakan langsung
        : Math.max(0, currentItem.quantity + change);
      
      if (newQuantity === 0) {
        // Hapus item jika kuantitas 0
        await set(itemRef, null);
      } else {
        await set(itemRef, {
          ...currentItem,
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        });
      }
      return true;
    }
    return false;
  }
  
  // Fungsi untuk memperbarui badge keranjang yang ditingkatkan
  function updateCartBadge(userId) {
    const cartRef = ref(database, `customers/${userId}/cart`);
    
    onValue(cartRef, (snapshot) => {
      let totalItems = 0;
      let totalPrice = 0;
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const item = childSnapshot.val();
          totalItems += item.quantity;
          totalPrice += item.price * item.quantity;
        });
      }
      
      // Update badge kuantitas
      const chartElement = document.getElementById('chart');
      let badge = chartElement.querySelector('.cart-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center';
        chartElement.style.position = 'relative';
        chartElement.appendChild(badge);
      }
      badge.textContent = totalItems;
      
      // Update informasi total harga jika diperlukan
      const totalPriceElement = document.getElementById('cart-total-price');
      if (totalPriceElement) {
        totalPriceElement.textContent = `Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}`;
      }
    });
  }
  
  // Fungsi untuk menampilkan form checkout yang ditingkatkan
  async function showCheckoutForm(productData, userId) {
    const cartRef = ref(database, `customers/${userId}/cart`);
    const cartSnapshot = await get(cartRef);
    let currentQuantity = 1;
    
    if (cartSnapshot.exists()) {
      cartSnapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        if (item.id === productData.id) {
          currentQuantity = item.quantity;
        }
      });
    }
  
    const result = await Swal.fire({
      title: 'Detail Pesanan',
      html: `
       <div class="w-full max-w-[90%] mx-auto space-y-4">
        <!-- Produk -->
        <div class="w-full bg-gray-50 p-[5%] rounded-xl shadow-sm">
          <h3 class="text-[1.25rem] font-bold mb-[4%]">Produk yang Dipesan:</h3>
          
          <!-- Container Produk -->
          <div class="w-full flex flex-col gap-[4%]">
            <!-- Detail Produk -->
            <div class="w-full flex flex-row gap-[4%] items-start">
              <div class="w-[30%] relative aspect-square">
                <img src="${productData.thumbnail}" 
                     alt="${productData.name}" 
                     class="w-full h-full object-cover rounded-lg shadow-md">
              </div>
              
              <div class="flex-1 space-y-[2%]">
                <p class="font-semibold text-[1.1rem]">${productData.name}</p>
                <p class="text-[0.9rem] text-gray-600">Variant: ${productData.variant}</p>
                <p class="text-[1.2rem] font-bold">
                  Rp ${new Intl.NumberFormat('id-ID').format(productData.price)}
                </p>
              </div>
            </div>

            <!-- Quantity Control -->
            <div class="w-full mt-[4%]">
              <div class="flex items-center justify-center gap-[3%]">
                <button class="w-[15%] aspect-square flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg transition-all" 
                        onclick="updateQuantity(-1)">
                  <span class="text-[1.2rem]">-</span>
                </button>
                <input type="number" 
                       id="quantity" 
                       value="${currentQuantity}" 
                       min="1" 
                       class="w-[30%] py-[2%] text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <button class="w-[15%] aspect-square flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg transition-all" 
                        onclick="updateQuantity(1)">
                  <span class="text-[1.2rem]">+</span>
                </button>
              </div>
              
              <div class="w-full text-center mt-[4%]">
                <p class="font-medium">
                  Total: <span class="text-[1.2rem] font-bold">
                    Rp <span id="total-price">${new Intl.NumberFormat('id-ID').format(productData.price * currentQuantity)}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Form Pemesan -->
        <div class="w-full space-y-[4%] bg-white p-[5%] rounded-xl shadow-sm">
          <div class="w-full">
            <label class="block text-[0.9rem] font-medium text-gray-700 mb-[2%]">
              Nama Pemesan:
            </label>
            <input id="customerName" 
                   class="w-full py-[2%] px-[3%] rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                   placeholder="Masukkan nama Anda">
          </div>
          
          <div class="w-full">
            <label class="block text-[0.9rem] font-medium text-gray-700 mb-[2%]">
              Nomor Meja:
            </label>
            <input id="tableNumber" 
                   class="w-full py-[2%] px-[3%] rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                   placeholder="Masukkan nomor meja">
          </div>
        </div>
      </div>
      `,
      customClass: {
        container: 'checkout-modal',
        popup: 'rounded-xl w-[95%] max-w-[600px] mx-auto',
        confirmButton: 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-[2%] px-[4%] rounded-lg transition-all',
        cancelButton: 'w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-[2%] px-[4%] rounded-lg transition-all',
        actions: 'flex flex-col sm:flex-row gap-[3%] w-full px-[5%] pb-[5%]'
      },
      confirmButtonText: 'Tambahkan ke Keranjang',
      showCancelButton: true,
      cancelButtonText: 'Batal',
      focusConfirm: false,
      buttonsStyling: false,
      didOpen: () => {
        const quantityInput = document.getElementById('quantity');
        const totalPriceSpan = document.getElementById('total-price');
        
        window.updateQuantity = (change) => {
          const input = document.getElementById('quantity');
          const currentVal = parseInt(input.value);
          const newVal = Math.max(1, currentVal + change);
          input.value = newVal;
          
          const total = newVal * productData.price;
          document.getElementById('total-price').textContent = 
            new Intl.NumberFormat('id-ID').format(total);
        };
        
        quantityInput.addEventListener('change', () => {
          const quantity = parseInt(quantityInput.value);
          if (quantity < 1) {
            quantityInput.value = 1;
            return;
          }
          
          const total = quantity * productData.price;
          totalPriceSpan.textContent = new Intl.NumberFormat('id-ID').format(total);
        });
      },
      preConfirm: () => {
        const quantity = parseInt(document.getElementById('quantity').value);
        const customerName = document.getElementById('customerName').value;
        const tableNumber = document.getElementById('tableNumber').value;
        
        if (!customerName || !tableNumber || quantity < 1) {
          Swal.showValidationMessage('Nama, nomor meja, dan kuantitas harus diisi dengan benar!');
          return false;
        }
        
        return { 
          customerName, 
          tableNumber, 
          quantity 
        };
      }
    });
  
    if (result.isConfirmed) {
      try {
        await set(ref(database, `customers/${userId}/profile`), {
          name: result.value.customerName,
          tableNumber: result.value.tableNumber,
          lastUpdated: new Date().toISOString()
        });
  
        await addToCart(userId, {
          ...productData,
          quantity: result.value.quantity,
          customerInfo: {
            name: result.value.customerName,
            tableNumber: result.value.tableNumber,
          }
        });
  
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Produk telah ditambahkan ke keranjang',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'w-[90%] max-w-[500px]',
            confirmButton: 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-[2%] px-[4%] rounded-lg transition-all'
          },
          buttonsStyling: false
        });
  
      } catch (error) {
        console.error('Error processing order:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Gagal memproses pesanan',
          text: 'Terjadi kesalahan, silakan coba lagi',
          customClass: {
            popup: 'w-[90%] max-w-[500px]',
            confirmButton: 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-[2%] px-[4%] rounded-lg transition-all'
          },
          buttonsStyling: false
        });
      }
    }
}

 // Tambahkan fungsi untuk mendapatkan varian unik
function getUniqueVariants(products) {
    const variants = new Set();
    products.forEach(product => {
      if (product.variant) {
        variants.add(product.variant);
      }
    });
    return Array.from(variants);
  }
  
  // Modifikasi fungsi loadbasicProducts
  function loadbasicProducts() {
    const basicRef = ref(database, 'basic-product');
    const basicContainer = document.getElementById("basic-card");
    const filterContainer = document.getElementById("filter-container");
  
    try {
      const cachedData = sessionStorage.getItem("basicProducts");
      if (cachedData && cachedData.length < 5000000) {
        const products = JSON.parse(cachedData);
        setupFilters(products);
        renderbasicProducts(products);
      }
    } catch (error) {
      console.warn("Cache tidak dapat digunakan:", error);
      sessionStorage.removeItem("basicProducts");
    }
  
    onValue(basicRef, (snapshot) => {
      if (snapshot.exists()) {
        const products = [];
        snapshot.forEach((childSnapshot) => {
          const product = childSnapshot.val();
          product.id = childSnapshot.key;
          products.push(product);
        });
  
        try {
          const jsonData = JSON.stringify(products);
          if (jsonData.length < 5000000) {
            sessionStorage.setItem("basicProducts", jsonData);
          }
        } catch (error) {
          console.warn("Gagal menyimpan cache:", error);
        }
  
        setupFilters(products);
        renderbasicProducts(products);
      } else {
        basicContainer.innerHTML = "<p class='text-gray-500'>Tidak ada produk basic.</p>";
      }
    });
  }
  
  // Fungsi untuk setup filter
  function setupFilters(products) {
    const variants = getUniqueVariants(products);
    const filterContainer = document.getElementById("filter-container");
    
    // Render filter buttons
    filterContainer.innerHTML = `
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-[#cbac85] mb-3">Filter berdasarkan Varian:</h3>
        <div class="flex flex-wrap gap-2">
          <button class="filter-btn active px-4 py-2 rounded-lg bg-[#3e1e04] text-white font-semibold transition-all"
                  data-variant="all">
            All
          </button>
          ${variants.map(variant => `
            <button class="filter-btn px-4 py-2 rounded-lg bg-[#3e1e04] text-white font-semibold hover:bg-yellow-900 transition-all"
                    data-variant="${variant}">
              ${variant}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  
    // Setup event listeners untuk filter
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active', 'bg-yellow-700'));
        // Add active class to clicked button
        button.classList.add('active', 'bg-yellow-700');
        
        const selectedVariant = button.dataset.variant;
        filterProducts(products, selectedVariant);
      });
    });
  }
  
  // Fungsi untuk filter produk
  function filterProducts(products, variant) {
    const filteredProducts = variant === 'all' 
      ? products 
      : products.filter(product => product.variant === variant);
    
    renderbasicProducts(filteredProducts);
  }
  
  // Modifikasi container HTML untuk grid layout
  // Tambahkan variabel untuk melacak jumlah produk yang ditampilkan
let currentDisplayCount = 3;

function renderbasicProducts(products) {
  const basicContainer = document.getElementById("basic-card");
  basicContainer.className = "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 lg:gap-6";
  
  // Kosongkan container setiap kali render
  basicContainer.innerHTML = products.length ? "" : "<p class='text-gray-500 col-span-full text-center'>Tidak ada produk yang sesuai dengan filter.</p>";

  // Slice array produk sesuai dengan jumlah yang ingin ditampilkan
  const productsToShow = products.slice(0, currentDisplayCount);

  productsToShow.forEach((product) => {
    const formattedPrice = new Intl.NumberFormat('id-ID').format(product.price);
    const productCard = `
      <div class="relative max-w-sm text-[#cbac85] bg-[#3e1e04] border border-gray-200 rounded-lg shadow-sm" data-product-id="${product.id}">
        <div class="relative">
          <img class="rounded-t-lg w-full h-48 object-cover" src="${product.thumbnail}" alt="${product.name}" />
          <span class="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-md">
            ${product.variant || 'N/A'}
          </span>
        </div>
        <div class="p-5">
          <h5 class="mb-2 text-sm lg:text-xl font-bold tracking-wide">${product.name}</h5>
          <p class="mb-3 font-medium text-sm lg:text-lg">Rp. ${formattedPrice}</p>
          <button class="order-button inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-700 rounded-lg hover:bg-yellow-900 transition duration-300">
            <svg class="me-2" xmlns="http://www.w3.org/2000/svg" fill="white" height="20px" width="20px" viewBox="0 0 24 24">
              <g id="shop-cart">
                <circle cx="9" cy="21" r="2"/>
                <circle cx="19" cy="21" r="2"/>
                <path d="M21,18H7.2l-4-16H0V0h4.8l0.8,3H24l-3.2,11H8.3l0.5,2H21V18z M7.8,12h11.5l2-7H6L7.8,12z"/>
              </g>
            </svg>
            Order Now
          </button>
        </div>
      </div>
    `;

    basicContainer.innerHTML += productCard;
  });

  // Tambahkan tombol "Load More" jika masih ada produk yang belum ditampilkan
  if (currentDisplayCount < products.length) {
    const loadMoreButton = document.createElement('button');
    loadMoreButton.className = 'col-span-full mx-auto mt-6 px-6 py-3 bg-yellow-700 text-white rounded-lg hover:bg-yellow-900 transition-all font-medium';
    loadMoreButton.textContent = 'Lebih Banyak';
    loadMoreButton.onclick = () => {
      currentDisplayCount += 6; // Tambah 4 produk setiap klik
      renderbasicProducts(products); // Render ulang dengan jumlah yang baru
    };
    basicContainer.appendChild(loadMoreButton);
  }

  setupOrderButtons();
}

// Modifikasi fungsi loadbasicProducts
function loadbasicProducts() {
  const basicRef = ref(database, 'basic-product');
  const basicContainer = document.getElementById("basic-card");
  
  // Reset currentDisplayCount setiap kali load products baru
  currentDisplayCount = 6;

  onValue(basicRef, (snapshot) => {
    if (snapshot.exists()) {
      const products = [];
      snapshot.forEach((childSnapshot) => {
        const product = childSnapshot.val();
        product.id = childSnapshot.key;
        products.push(product);
      });

      setupFilters(products);
      renderbasicProducts(products);
    } else {
      basicContainer.innerHTML = "<p class='text-gray-500'>Tidak ada produk basic.</p>";
    }
  });
}
  // Fungsi untuk merender produk
 
  

  // Setup order buttons dengan flow yang baru
  function setupOrderButtons() {
    const orderButtons = document.querySelectorAll('.order-button');
    orderButtons.forEach(button => {
      button.addEventListener('click', async () => {
        try {
          const user = auth.currentUser;
          const productData = getProductData(button);
          
          if (!user) {
            // Proses login
            const user = await signInWithGoogle();
            if (user) {
              // Setelah login, tampilkan form checkout
              await showCheckoutForm(productData, user.uid);
            }
          } else {
            // User sudah login, langsung tampilkan form checkout
            await showCheckoutForm(productData, user.uid);
          }
        } catch (error) {
          console.error("Error:", error);
          Swal.fire({
            icon: 'error',
            title: 'Terjadi Kesalahan',
            text: 'Gagal memproses pesanan'
          });
        }
      });
    });
  }

  // Fungsi untuk mendapatkan data produk
  function getProductData(orderButton) {
    const productCard = orderButton.closest('[data-product-id]');
    return {
      id: productCard.dataset.productId,
      name: productCard.querySelector('h5').textContent,
      price: parseInt(productCard.querySelector('.font-medium').textContent.replace(/[^0-9]/g, '')),
      thumbnail: productCard.querySelector('img').src,
      variant: productCard.querySelector('.bg-yellow-500').textContent.trim(),
      quantity: 1
    };
  }

 

  // Monitor status autentikasi
  onAuthStateChanged(auth, (user) => {
    if (user) {
      updateCartBadge(user.uid);
    }
  });

  // Panggil fungsi saat halaman dimuat
  loadbasicProducts();
});