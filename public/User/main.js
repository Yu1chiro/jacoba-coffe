// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref,  onValue, remove, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userPhoto').src = user.photoURL;
            document.getElementById('userName').textContent = user.displayName;
            loadCheckoutItems(user.uid);
        } else {
            window.location.href = '/';
        }
    });

    function loadCheckoutItems(userId) {
        const cartRef = ref(database, `customers/${userId}/cart`);
        const checkoutContainer = document.getElementById('cartItems');
        let cachedItems = new Map();
        let loadedImages = 0;
        let totalItems = 0;
        let totalPrice = 0;

        // Fungsi untuk memuat gambar secara asinkron
        function preloadImage(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
                img.src = url;
            });
        }

        // Fungsi untuk merender item
        function renderItem(item) {
            return `
                <div class="flex items-center justify-between border-b pb-4">
                    <div class="flex items-center gap-4">
                        <img src="${item.thumbnail}" 
                             alt="${item.name}" 
                             class="w-20 h-20 object-cover rounded"
                             loading="lazy">
                        <div>
                            <h3 class="font-semibold">${item.name}</h3>
                            <p class="text-gray-600">Rp. ${new Intl.NumberFormat('id-ID').format(item.price)}</p>
                            <p class="text-gray-600">Jumlah: ${item.quantity}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Menggunakan onValue dengan optimasi
        onValue(cartRef, async (snapshot) => {
            checkoutContainer.innerHTML = '';
            totalItems = 0;
            totalPrice = 0;

            if (snapshot.exists()) {
                const items = [];
                const imagePromises = [];

                snapshot.forEach((childSnapshot) => {
                    const item = childSnapshot.val();
                    items.push(item);
                    totalItems += item.quantity;
                    totalPrice += item.price * item.quantity;

                    // Cek apakah thumbnail sudah di-cache
                    if (!cachedItems.has(item.thumbnail)) {
                        imagePromises.push(preloadImage(item.thumbnail));
                        cachedItems.set(item.thumbnail, true);
                    }
                });

                // Render konten awal dengan placeholder
                const initialContent = items.map(item => renderItem(item)).join('');
                checkoutContainer.innerHTML = initialContent;

                // Load gambar secara paralel
                if (imagePromises.length > 0) {
                    try {
                        await Promise.all(imagePromises);
                    } catch (error) {
                        console.warn('Beberapa gambar gagal dimuat:', error);
                    }
                }
            } else {
                checkoutContainer.innerHTML = '<p class="text-gray-500">Keranjang belanja kosong</p>';
            }

            // Update total
            document.getElementById('totalItems').textContent = totalItems;
            document.getElementById('totalPrice').textContent = `Rp. ${new Intl.NumberFormat('id-ID').format(totalPrice)}`;
        }, {
            onlyOnce: false
        });
    }


  // Handle sign out
  document.getElementById('signOut').addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
      alert('Gagal sign out');
    }
  });

  document.getElementById('checkoutButton').addEventListener('click', async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const database = getDatabase();
    
    if (!user) {
        Swal.fire('Error', 'Silakan login terlebih dahulu', 'error');
        return;
    }

    // Ambil data cart
    const cartRef = ref(database, `customers/${user.uid}/cart`);
    const cartSnapshot = await get(cartRef);
    
    if (!cartSnapshot.exists()) {
        Swal.fire('Error', 'Keranjang belanja kosong', 'error');
        return;
    }

    const cartItems = [];
    let totalPrice = 0;
    
    cartSnapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        cartItems.push(item);
        totalPrice += item.price * item.quantity;
    });

    // Tampilkan modal pemilihan metode pembayaran
    const { value: paymentMethod } = await Swal.fire({
        title: 'Pilih Metode Pembayaran',
        input: 'radio',
        inputOptions: {
            'QRIS': 'QRIS',
            'CASH': 'CASH'
        },
        inputValidator: (value) => {
            if (!value) {
                return 'Pilih metode pembayaran!';
            }
        }
    });

    if (paymentMethod === 'QRIS') {
        await handleQRISPayment(user, cartItems, totalPrice);
    } else {
        await handleCashPayment(user, cartItems, totalPrice);
    }
});

async function handleQRISPayment(user, cartItems, totalPrice) {
    // Tampilkan QR Code (ganti dengan QR code cafe Anda)
    await Swal.fire({
        title: 'Scan QR Code',
        html: `
            <img src="/User/img/qris.jpeg" class="mx-auto w-64 h-64">
            <p class="mt-4">Total Pembayaran: Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</p>
        `,
        confirmButtonText: 'Upload Bukti Pembayaran'
    });

    // Upload bukti pembayaran
    const { value: buktiPembayaran } = await Swal.fire({
        title: 'Upload Bukti Pembayaran',
        input: 'file',
        inputAttributes: {
            accept: 'image/*',
            'aria-label': 'Upload bukti pembayaran'
        },
        showCancelButton: true,
        confirmButtonText: 'Upload'
    });

    if (buktiPembayaran) {
        await processOrder(user, cartItems, totalPrice, 'QRIS', buktiPembayaran);
    }
}

// First, initialize jsPDF from the window object
const { jsPDF } = window.jspdf;

async function handleCashPayment(user, cartItems, totalPrice) {
    const receiptHTML = generateReceiptHTML(cartItems, totalPrice, user.displayName);
    
    await Swal.fire({
        title: 'Nota Pembayaran',
        html: receiptHTML,
        confirmButtonText: 'Download Nota',
        showCancelButton: true
    });

    try {
        // Create new PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200]
        });

        // Load and add logo
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Calculate dimensions to maintain aspect ratio
                    const imgWidth = 20;
                    const imgHeight = (img.height * imgWidth) / img.width;
                    
                    // Add image to PDF, centered at the top
                    doc.addImage(
                        img, 
                        'PNG', 
                        (80 - imgWidth) / 2, // center horizontally
                        5, // top margin
                        imgWidth,
                        imgHeight
                    );
                    resolve();
                } catch (err) {
                    console.error('Error adding image to PDF:', err);
                    resolve(); // Continue without logo if there's an error
                }
            };
            img.onerror = () => {
                console.error('Error loading logo');
                resolve(); // Continue without logo if loading fails
            };
            img.src = '/img/logo.png';
        });

        // Set font
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        // Header text (adjusted y-positions to accommodate logo)
        doc.setFontSize(12);
        doc.text('Nature Coffe', 40, 30, { align: 'center' });
        doc.setFontSize(8);
        doc.text('Jalan Pantura', 40, 35, { align: 'center' });
        doc.text('Telp: 12345678', 40, 40, { align: 'center' });

        // Garis pemisah
        doc.line(5, 42, 75, 42);

        // Informasi Order
        const date = new Date().toLocaleString('id-ID');
        doc.text(`Tanggal: ${date}`, 5, 47);
        doc.text(`Customer: ${user.displayName}`, 5, 52);
        doc.text(`Order #${Date.now().toString().slice(-6)}`, 5, 57);

        // Garis pemisah
        doc.line(5, 59, 75, 59);

        // Items
        let yPos = 64;
        cartItems.forEach(item => {
            doc.text(item.name, 5, yPos);
            doc.text(`${item.quantity} x Rp ${new Intl.NumberFormat('id-ID').format(item.price)}`, 5, yPos + 4);
            doc.text(`Rp ${new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}`, 75, yPos + 4, { align: 'right' });
            yPos += 10;
        });

        // Garis pemisah
        doc.line(5, yPos, 75, yPos);
        yPos += 5;

        // Total
        doc.setFontSize(10);
        doc.text('Total:', 5, yPos);
        doc.text(`Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}`, 75, yPos, { align: 'right' });
        
        // Catatan
        const orderNotes = document.getElementById('orderNotes').value;
        if (orderNotes) {
            yPos += 10;
            doc.setFontSize(8);
            doc.text('Catatan:', 5, yPos);
            const splitNotes = doc.splitTextToSize(orderNotes, 65);
            splitNotes.forEach(line => {
                yPos += 4;
                doc.text(line, 5, yPos);
            });
        }

        // Garis pemisah
        yPos += 7;
        doc.line(5, yPos, 75, yPos);

        // WiFi Info
        yPos += 5;
        doc.text('WiFi: NatureCoffe', 40, yPos, { align: 'center' });
        doc.text('Password: pantura2024', 40, yPos + 4, { align: 'center' });

        // Footer
        yPos += 10;
        doc.text('== Terima kasih ==', 40, yPos, { align: 'center' });
        doc.text('Selamat menikmati!', 40, yPos + 4, { align: 'center' });

        // Download PDF
        doc.save(`receipt-${Date.now()}.pdf`);

        // Proses order
        await processOrder(user, cartItems, totalPrice, 'CASH');
    } catch (error) {
        console.error('Error generating PDF:', error);
        Swal.fire('Error', 'Gagal membuat nota pembayaran', 'error');
    }
}

function generateReceiptHTML(cartItems, totalPrice, customerName) {
    const date = new Date().toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const orderNotes = document.getElementById('orderNotes').value;
    const orderId = Date.now().toString().slice(-6);
    
    return `
        <div id="receipt-preview" class="bg-white p-8 max-w-[380px] mx-auto font-mono text-sm leading-tight">
            <div class="text-center mb-6">
                <img src="/img/logo.png" class="w-20 h-20 mx-auto mb-3 object-contain">
                <h2 class="text-xl font-bold mb-1">Nature Coffe</h2>
                <p class="mb-1">Jalan Pantura</p>
                <p class="mb-1">Telp: 12345678</p>
            </div>
            
            <div class="border-t border-b border-black py-3 mb-4 text-left">
                <p class="mb-1">Tanggal: ${date}</p>
                <p class="mb-1">Customer: ${customerName}</p>
                <p class="mb-1">Order #${orderId}</p>
            </div>

            <div class="mb-4">
                <div class="flex justify-between mb-2 font-bold">
                    <span>Item</span>
                    <span>Subtotal</span>
                </div>
                ${cartItems.map(item => `
                    <div class="flex justify-between mb-2">
                        <div class="flex-1">
                            <p>${item.name}</p>
                            <p class="text-gray-600">${item.quantity} x Rp ${new Intl.NumberFormat('id-ID').format(item.price)}</p>
                        </div>
                        <p class="ml-4">Rp ${new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}</p>
                    </div>
                `).join('')}
            </div>

            <div class="border-t border-black pt-3 mb-4">
                <div class="flex justify-between font-bold text-lg">
                    <p>Total</p>
                    <p>Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</p>
                </div>
            </div>

            ${orderNotes ? `
                <div class="mb-4 border-t border-black pt-3">
                    <p class="font-bold mb-1">Catatan:</p>
                    <p class="whitespace-pre-wrap">${orderNotes}</p>
                </div>
            ` : ''}

            <div class="text-center border-t border-black pt-3">
                <div class="mb-3">
                    <p class="font-bold mb-1">WiFi Information</p>
                    <p>SSID: NatureCoffe</p>
                    <p>Pass: pantura2024</p>
                </div>
                <p class="font-bold">== Terima kasih ==</p>
                <p>Selamat menikmati!</p>
            </div>
        </div>
    `;
}

async function processOrder(user, cartItems, totalPrice, paymentMethod, buktiPembayaran = null) {
    const database = getDatabase();
    const orderRef = ref(database, `customer-orders/${user.uid}/${Date.now()}`);
    
    // Compress images before saving to database
    const processedItems = await Promise.all(cartItems.map(async item => {
        const compressedImage = await compressImage(item.thumbnail);
        return {
            ...item,
            thumbnail: compressedImage
        };
    }));

    // Create order data
    const orderData = {
        items: processedItems,
        totalPrice: totalPrice,
        paymentMethod: paymentMethod,
        orderNotes: document.getElementById('orderNotes').value,
        timestamp: Date.now(),
        status: 'pending',
        customerName: user.displayName,
        customerEmail: user.email
    };

    if (buktiPembayaran) {
        const compressedBukti = await compressImage(buktiPembayaran);
        orderData.buktiPembayaran = compressedBukti;
    }

    try {
        // Save order to database
        await set(orderRef, orderData);
        
        // Clear cart
        const cartRef = ref(database, `customers/${user.uid}/cart`);
        await remove(cartRef);

        Swal.fire('Sukses', 'Pesanan berhasil diproses', 'success');
    } catch (error) {
        console.error('Error processing order:', error);
        Swal.fire('Error', 'Gagal memproses pesanan', 'error');
    }
}

async function compressImage(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set target width and maintain aspect ratio
            const targetWidth = 300;
            const scaleFactor = targetWidth / img.width;
            canvas.width = targetWidth;
            canvas.height = img.height * scaleFactor;
            
            // Draw and compress image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = imageData;
    });
}
function initializeOrderMonitor() {
    const database = getDatabase();
    const ordersContainer = document.getElementById('history-user');
    const auth = getAuth();

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (!user) return;

        const ordersRef = ref(database, 'customer-orders');
        
        // Set up real-time listener
        onValue(ordersRef, (snapshot) => {
            const allOrders = snapshot.val();
            if (!allOrders) {
                ordersContainer.innerHTML = '<p class="text-center p-4">No orders found.</p>';
                return;
            }

            let tableHTML = `
                <table class="min-w-full border-collapse">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border p-2">Order Time</th>
                            <th class="border p-2">Customer</th>
                            <th class="border p-2">Items</th>
                            <th class="border p-2">Notes</th>
                            <th class="border p-2">Total</th>
                            <th class="border p-2">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // Process all orders
            const orders = [];
            Object.entries(allOrders).forEach(([userId, userOrders]) => {
                Object.entries(userOrders).forEach(([orderId, orderData]) => {
                    orders.push({
                        orderId,
                        timestamp: parseInt(orderId),
                        ...orderData
                    });
                });
            });

            // Sort orders by timestamp (newest first)
            orders.sort((a, b) => b.timestamp - a.timestamp);

            // Generate table rows
            orders.forEach(order => {
                const orderTime = new Date(order.timestamp).toLocaleString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let itemsList = '';
                let totalPrice = 0;

                // Process items
                if (order.items) {
                    Object.values(order.items).forEach(item => {
                        itemsList += `${item.name} (${item.quantity}x Rp ${new Intl.NumberFormat('id-ID').format(item.price)})<br>`;
                        totalPrice += (item.price * (item.quantity || 1));
                    });
                }

                // Add status color classes
                let statusClass = '';
                switch (order.status?.toLowerCase()) {
                    case 'completed':
                        statusClass = 'bg-green-100 text-green-800';
                        break;
                    case 'pending':
                        statusClass = 'bg-yellow-100 text-yellow-800';
                        break;
                    case 'cancelled':
                        statusClass = 'bg-red-100 text-red-800';
                        break;
                    default:
                        statusClass = 'bg-gray-100 text-gray-800';
                }

                tableHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="border p-2">${orderTime}</td>
                        <td class="border p-2">
                            <div class="font-medium">${order.customerName || 'N/A'}</div>
                            <div class="text-sm text-gray-600">${order.customerEmail || ''}</div>
                        </td>
                        <td class="border p-2">${itemsList}</td>
                        <td class="border p-2">${order.orderNotes || '-'}</td>
                        <td class="border p-2">Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</td>
                        <td class="border p-2">
                            <span class="px-2 py-1 rounded-full text-sm ${statusClass} capitalize">
                                ${order.status || 'pending'}
                            </span>
                        </td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            ordersContainer.innerHTML = tableHTML;
        });
    });
}

// Initialize the monitor when the page loads
document.addEventListener('DOMContentLoaded', initializeOrderMonitor);
});