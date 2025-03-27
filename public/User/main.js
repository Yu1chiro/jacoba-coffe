// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, update,  onValue, remove, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

        // Ambil nilai dari input name dan meja
        const customerName = document.getElementById('customerName').value;
        const tableNumber = document.getElementById('tableNumber').value;

        // Tampilkan modal pemilihan metode pembayaran
        const modalResult = await Swal.fire({
            title: 'Pilih Metode Pembayaran',
            html: `
                <div class="flex flex-col space-y-4 text-left">
                    <div class="payment-option flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100" data-method="QRIS">
                        <img src="https://images.seeklogo.com/logo-png/39/1/quick-response-code-indonesia-standard-qris-logo-png_seeklogo-391791.png" class="w-10 h-10" alt="QRIS">
                        <span class="text-lg font-semibold">QRIS : Transfer</span>
                    </div>
                    <div class="payment-option flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100" data-method="CASH">
                        <img src="https://media.istockphoto.com/id/1452667058/id/vektor/ikon-pembayaran-tunai-di-vektor-logo.jpg?s=612x612&w=0&k=20&c=L-cNI2glF2UwANI0WjbvgyuqBysVCUS64lHt0JcQhoU=" class="w-10 h-10" alt="CASH">
                        <span class="text-lg font-semibold">CASH : Tunai</span>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Batal',
            allowOutsideClick: false,
            didOpen: () => {
                // Tambahkan event listener untuk opsi pembayaran
                const paymentOptions = document.querySelectorAll('.payment-option');
                paymentOptions.forEach(option => {
                    option.addEventListener('click', async () => {
                        const method = option.dataset.method;
                        Swal.close();
                        
                        // Proses sesuai metode yang dipilih
                        if (method === 'QRIS') {
                            await handleQRISPayment(user, cartItems, totalPrice, customerName, tableNumber);
                        } else if (method === 'CASH') {
                            await handleCashPayment(user, cartItems, totalPrice, customerName, tableNumber);
                        }
                    });
                });
            }
        });

        // Jika user membatalkan atau mengklik di luar, tidak ada aksi yang dijalankan
        if (modalResult.dismiss === Swal.DismissReason.cancel || 
            modalResult.dismiss === Swal.DismissReason.backdrop) {
            return;
        }
    });

    async function handleQRISPayment(user, cartItems, totalPrice, customerName, tableNumber) {
        try {
            const orderNotes = document.getElementById('orderNotes')?.value || '';
            
            // Show QR Code and wait for payment proof upload
            const qrResult = await Swal.fire({
                title: 'Scan QR Code',
                html: `
                    <img src="/User/img/QRIS.jpeg" class="mx-auto w-52 h-auto">
                    <p class="mt-4">Total Pembayaran: Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</p>
                `,
                confirmButtonText: 'Upload Bukti Pembayaran',
                showCancelButton: true,
                cancelButtonText: 'Batal'
            });
    
            if (qrResult.isConfirmed) {
                // Upload payment proof
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
                    // Show loading state
                    Swal.fire({
                        title: 'Memproses Pembayaran',
                        text: 'Mohon tunggu sebentar...',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
    
                    // Image compression function
                    const compressImage = async (file) => {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    let width = img.width;
                                    let height = img.height;
    
                                    const MAX_WIDTH = 800;
                                    const MAX_HEIGHT = 800;
    
                                    if (width > height) {
                                        if (width > MAX_WIDTH) {
                                            height *= MAX_WIDTH / width;
                                            width = MAX_WIDTH;
                                        }
                                    } else {
                                        if (height > MAX_HEIGHT) {
                                            width *= MAX_HEIGHT / height;
                                            height = MAX_HEIGHT;
                                        }
                                    }
    
                                    canvas.width = width;
                                    canvas.height = height;
    
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, 0, 0, width, height);
    
                                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                    resolve(compressedBase64);
                                };
                                img.src = e.target.result;
                            };
                            reader.readAsDataURL(file);
                        });
                    };
    
                    // Compress image
                    const compressedPaymentProof = await compressImage(buktiPembayaran);
                    
                    // Create complete order data
                    const orderData = {
                        items: cartItems,
                        totalPrice: totalPrice,
                        paymentMethod: 'QRIS',
                        paymentProof: compressedPaymentProof,
                        status: 'pending',
                        timestamp: Date.now(),
                        userId: user.uid,
                        customerName: customerName,
                        tableNumber: tableNumber,
                        notes: orderNotes, // Standard field
                        orderNotes: orderNotes // For backward compatibility
                    };
    
                    // Save to database
                    const database = getDatabase();
                    const orderRef = ref(database, `customer-orders/${user.uid}/${orderData.timestamp}`);
                    await set(orderRef, orderData);
    
                    // Also save to all-orders
                    const allOrdersRef = ref(database, `all-orders/${orderData.timestamp}`);
                    await set(allOrdersRef, orderData);
    
                    // Clear cart
                    const cartRef = ref(database, `customers/${user.uid}/cart`);
                    await remove(cartRef);
    
                    // Send Telegram notification - THIS IS THE CRUCIAL FIX
                    try {
                        const notificationResponse = await fetch('/send-order-notification', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                ...orderData,
                                // Explicitly include all necessary fields
                                paymentMethod: 'QRIS',
                                alertType: 'qris_payment',
                                needsVerification: true
                            })
                        });
    
                        if (!notificationResponse.ok) {
                            const errorText = await notificationResponse.text();
                            console.error('Telegram notification failed:', errorText);
                            // Continue even if notification fails
                        }
                    } catch (telegramError) {
                        console.error('Telegram notification error:', telegramError);
                        // Continue even if notification fails
                    }
    
                    // Show success message
                    await Swal.fire({
                        icon: 'success',
                        title: 'Pembayaran Berhasil!',
                        html: `
                            <div class="text-center">
                                <p class="mb-2">Terima kasih atas pesanan Anda</p>
                                <p class="text-sm text-gray-600">Pesanan Anda sedang diproses</p>
                            </div>
                        `,
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        didOpen: () => {
                            const b = Swal.getHtmlContainer().querySelector('p');
                            b.style.animation = 'bounce 0.5s ease-in-out';
                        }
                    });
    
                    const { value: formValues } = await Swal.fire({
                        html:
                        `
                         <div class="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
                            <div class="mb-6">
                            <h2 class="font-semibold text-2xl">Hello There!</h2>
                                <p class="text-gray-600">Yuk beri testimonial mu ketika belanja di Jacoba</p>
                            </div>
                            
                            <form id="testimonialForm" class="space-y-4">
                                <div>
                                    <label for="customerName" class="block text-sm text-start font-medium text-gray-700 mb-1">Nama : </label>
                                    <input 
                                        id="customerName" 
                                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder="Nama"
                                        required
                                    >
                                </div>
                                
                                <div>
                                    <label for="productName" class="block text-sm text-start font-medium text-gray-700 mb-1">Menu Favorit</label>
                                    <input 
                                        id="productName" 
                                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                        placeholder="Produk Favorit yg sering dibeli"
                                        required
                                    >
                                </div>
                                
                                <div>
                                    <label for="testimonialText" class="block text-start text-sm font-medium text-gray-700 mb-1">Testimonial</label>
                                    <div class="relative">
                                        <textarea 
                                            id="testimonialText" 
                                            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                            placeholder="Testimonial Anda (maks 100 karakter)" 
                                            maxlength="100"
                                            rows="4"
                                            required
                                        ></textarea>
                                        <div class="absolute bottom-2 right-2 text-xs text-gray-500">
                                            <span id="charCount">0</span>/100
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        `,
                        focusConfirm: false,
                        showCancelButton: true,
                        confirmButtonText: 'Kirim',
                        cancelButtonText: 'Batal',
                        didOpen: () => {
                            // Tambahkan penghitung karakter
                            document.getElementById('testimonialText').addEventListener('input', function() {
                                document.getElementById('charCount').textContent = this.value.length;
                            });
                        },
                        preConfirm: () => {
                            const customerName = document.getElementById('customerName').value;
                            const productName = document.getElementById('productName').value;
                            const testimonialText = document.getElementById('testimonialText').value;
                    
                            
                    
                            return {
                                customerName: customerName,
                                productName: productName,
                                testimonialText: testimonialText
                            };
                        }
                    });
                    if (formValues) {
                        try {
                            console.log("Data yang akan dikirim ke server:", formValues);
                            
                            const response = await fetch('/submit-testimonial', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    customerName: formValues.customerName,
                                    productName: formValues.productName,
                                    testimonial: formValues.testimonialText
                                }),
                            });
                    
                            const result = await response.json();
                            console.log("Hasil dari server:", result);
                    
                            if (response.ok) {
                                await Swal.fire({
                                    icon: 'success',
                                    title: 'Terima Kasih!',
                                    text: 'Testimonial Anda telah berhasil dikirim.',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            } else {
                                await Swal.fire({
                                    icon: 'error',
                                    title: 'Oops...',
                                    text: 'Gagal mengirim testimonial: ' + result.message,
                                });
                            }
                        } catch (error) {
                            console.error("Error:", error);
                            await Swal.fire({
                                icon: 'error',
                                title: 'Oops...',
                                text: 'Terjadi kesalahan: ' + error.message,
                            });
                        }
                    }
                    
                   
                }
            }
        } catch (error) {
            console.error('Error processing QRIS payment:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Gagal Memproses Pembayaran',
                text: 'Silakan coba lagi: ' + error.message
            });
        }
    }    

    async function handleCashPayment(user, cartItems, totalPrice, customerName, tableNumber) {
        const receiptHTML = generateReceiptHTML(cartItems, totalPrice, customerName, tableNumber);
        
        // Tampilkan modal nota pembayaran dan tunggu respon user
        const result = await Swal.fire({
            title: 'Nota Pembayaran',
            html: receiptHTML,
            confirmButtonText: 'Konfirmasi Pembayaran',
            cancelButtonText: 'Batal',
            showCancelButton: true,
            allowOutsideClick: false // Mencegah modal tertutup ketika klik di luar
        });
    
        // Hanya lanjutkan proses jika user mengklik tombol konfirmasi
        if (result.isConfirmed) {
            try {
                // Create new PDF document
                const doc = new window.jspdf.jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [80, 200]
                });
    
                // Set font
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
    
                // Header text (adjusted y-positions to accommodate logo)
                doc.setFontSize(12);
                doc.text('Jacoba Coffe', 40, 30, { align: 'center' });
                doc.setFontSize(8);
                doc.text('Jalan Menuh', 40, 35, { align: 'center' });
                doc.text('jacoba-coffe.vercel.app', 40, 40, { align: 'center' });
    
                // Garis pemisah
                doc.line(5, 42, 75, 42);
    
                // Informasi Order
                const date = new Date().toLocaleString('id-ID');
                doc.text(`Tanggal: ${date}`, 5, 47);
                doc.text(`Customer: ${customerName}`, 5, 52);
                doc.text(`Meja: ${tableNumber}`, 5, 57);
                doc.text(`Order #${Date.now().toString().slice(-6)}`, 5, 62);
    
                // Garis pemisah
                doc.line(5, 64, 75, 64);
    
                // Items
                let yPos = 69;
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
                doc.text('WiFi: CEMPAKA', 40, yPos, { align: 'center' });
                doc.text('Password: Singaraja2025', 40, yPos + 4, { align: 'center' });
    
                // Footer
                yPos += 10;
                doc.text('== Terima kasih ==', 40, yPos, { align: 'center' });
                doc.text('Selamat menikmati!', 40, yPos + 4, { align: 'center' });
                
                // Download PDF
                doc.save(`receipt-${Date.now()}.pdf`);
    
                // Proses order hanya jika konfirmasi berhasil
                await processOrder(user, cartItems, totalPrice, 'CASH', customerName, tableNumber);
                
                // Tampilkan pesan sukses
             // Tampilkan SweetAlert2 saat pembayaran berhasil
            await Swal.fire({
                icon: 'success',
                title: 'Pembayaran Berhasil',
                text: 'Pesanan Anda sedang diproses',
                timer: 2000,
                showConfirmButton: true
            });

// Tampilkan form testimonial menggunakan SweetAlert2
const { value: formValues } = await Swal.fire({
    html:
    `
     <div class="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <div class="mb-6">
        <h2 class="font-semibold text-2xl">Hello There!</h2>
            <p class="text-gray-600">Yuk beri testimonial mu ketika belanja</p>
        </div>
        
        <form id="testimonialForm" class="space-y-4">
            <div>
                <label for="customerName" class="block text-sm text-start font-medium text-gray-700 mb-1">Nama : </label>
                <input 
                    id="customerName" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Nama"
                    required
                >
            </div>
            
            <div>
                <label for="productName" class="block text-sm text-start font-medium text-gray-700 mb-1">Menu Favorit</label>
                <input 
                    id="productName" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Produk Favorit yg sering dibeli"
                    required
                >
            </div>
            
            <div>
                <label for="testimonialText" class="block text-start text-sm font-medium text-gray-700 mb-1">Testimonial</label>
                <div class="relative">
                    <textarea 
                        id="testimonialText" 
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="Testimonial Anda (maks 100 karakter)" 
                        maxlength="100"
                        rows="4"
                        required
                    ></textarea>
                    <div class="absolute bottom-2 right-2 text-xs text-gray-500">
                        <span id="charCount">0</span>/100
                    </div>
                </div>
            </div>
        </form>
    </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Kirim',
    cancelButtonText: 'Batal',
    didOpen: () => {
        // Tambahkan penghitung karakter
        document.getElementById('testimonialText').addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
    },
    preConfirm: () => {
        const customerName = document.getElementById('customerName').value;
        const productName = document.getElementById('productName').value;
        const testimonialText = document.getElementById('testimonialText').value;

        

        return {
            customerName: customerName,
            productName: productName,
            testimonialText: testimonialText
        };
    }
});

// Jika form dikirim, kirim data ke server
if (formValues) {
    try {
        console.log("Data yang akan dikirim ke server:", formValues);
        
        const response = await fetch('/submit-testimonial', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerName: formValues.customerName,
                productName: formValues.productName,
                testimonial: formValues.testimonialText
            }),
        });

        const result = await response.json();
        console.log("Hasil dari server:", result);

        if (response.ok) {
            await Swal.fire({
                icon: 'success',
                title: 'Terima Kasih!',
                text: 'Testimonial Anda telah berhasil dikirim.',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            await Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Gagal mengirim testimonial: ' + result.message,
            });
        }
    } catch (error) {
        console.error("Error:", error);
        await Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Terjadi kesalahan: ' + error.message,
        });
    }
}
// Redirect ke halaman dashboard
// window.location.href = '/Dashboard';
            } catch (error) {
                console.error('Error generating PDF:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Terjadi kesalahan saat memproses pembayaran'
                });
            }
        }
    }

    function generateReceiptHTML(cartItems, totalPrice, customerName, tableNumber) {
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
           <div id="receipt-preview" class="bg-white p-8 max-w-[380px] mx-auto rounded-lg shadow-lg">
                <div class="text-center mb-4">
                    <h2 class="font-bold text-xl">Jacoba Coffee</h2>
                    <p class="text-gray-600 text-sm">Jalan Menuh</p>
                    <p class="text-gray-600 text-sm">jacoba-coffe.vercel.app</p>
                </div>
                
                <div class="border-t border-b border-gray-200 py-2 mb-4">
                    <p class="text-sm">Tanggal: ${date}</p>
                    <p class="text-sm">Customer: ${customerName}</p>
                    <p class="text-sm">Meja: ${tableNumber}</p>
                    <p class="text-sm">Order #${orderId}</p>
                </div>
                
                <div class="mb-4">
                    <h3 class="font-semibold mb-2">Pesanan:</h3>
                    <div class="space-y-2">
                        ${cartItems.map(item => `
                            <div class="flex justify-between text-sm">
                                <div>
                                    <p>${item.name}</p>
                                    <p class="text-gray-600">${item.quantity} x Rp ${new Intl.NumberFormat('id-ID').format(item.price)}</p>
                                </div>
                                <p>Rp ${new Intl.NumberFormat('id-ID').format(item.price * item.quantity)}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="border-t border-gray-200 pt-2 mb-4">
                    <div class="flex justify-between font-bold">
                        <p>Total:</p>
                        <p>Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</p>
                    </div>
                </div>
                
                ${orderNotes ? `
                <div class="mb-4">
                    <h3 class="font-semibold mb-1">Catatan:</h3>
                    <p class="text-sm text-gray-700">${orderNotes}</p>
                </div>
                ` : ''}
                
                <div class="border-t border-gray-200 pt-2 text-center text-sm">
                    <p class="font-medium">WiFi: CEMPAKA</p>
                    <p class="font-medium">Password: Singaraja2025</p>
                </div>
                
                <div class="text-center mt-4">
                    <p class="font-medium">== Terima kasih ==</p>
                    <p class="text-sm">Selamat menikmati!</p>
                </div>
            </div>
        `;
    }

   // Tambahkan ini di bagian import Firebase

   async function processOrder(user, cartItems, totalPrice, paymentMethod, customerName, tableNumber, paymentProof = null) {
    const database = getDatabase();
    const orderNotes = document.getElementById('orderNotes').value;
    
    // Validate payment method
    const validPaymentMethods = ['CASH', 'QRIS'];
    if (!validPaymentMethods.includes(paymentMethod)) {
        throw new Error('Invalid payment method');
    }

    // Format items data
    const formattedItems = Array.isArray(cartItems) 
        ? cartItems 
        : Object.values(cartItems || {}).map(item => ({
            name: item.name || 'Unknown Item',
            quantity: item.quantity || 1,
            price: item.price || 0
        }));

    // Prepare complete order data
    const orderData = {
        items: formattedItems,
        totalPrice: totalPrice,
        paymentMethod: paymentMethod, // Include payment method
        status: paymentMethod === 'CASH' ? 'paid' : 'pending',
        timestamp: Date.now(),
        userId: user.uid,
        customerName: customerName || 'Guest',
        tableNumber: tableNumber || 'N/A',
        notes: orderNotes || '',
        orderNotes: orderNotes || '', // For backward compatibility
        ...(paymentMethod === 'QRIS' && { 
            paymentProof: paymentProof,
            needsVerification: true
        })
    };

    try {
        // Save to database
        const orderRef = ref(database, `customer-orders/${user.uid}/${orderData.timestamp}`);
        await set(orderRef, orderData);

        // Also save to all-orders
        const allOrdersRef = ref(database, `all-orders/${orderData.timestamp}`);
        await set(allOrdersRef, orderData);

        // Clear cart
        const cartRef = ref(database, `customers/${user.uid}/cart`);
        await remove(cartRef);

        // Send Telegram notification
        try {
            const notificationResponse = await fetch('/send-order-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...orderData,
                    // Ensure all required fields are included
                    paymentMethod: paymentMethod,
                    alertType: 'new_order',
                    // Include both notes fields for compatibility
                    notes: orderNotes,
                    orderNotes: orderNotes
                })
            });

            if (!notificationResponse.ok) {
                const errorText = await notificationResponse.text();
                console.error('Notification failed:', errorText);
                throw new Error(`Notification failed: ${errorText}`);
            }
            
            console.log('Notification sent successfully');
        } catch (telegramError) {
            console.error('Telegram notification error:', telegramError);
            // Continue even if notification fails
        }

        return {
            orderId: orderData.timestamp,
            paymentMethod: paymentMethod
        };

    } catch (error) {
        console.error('Order processing error:', {
            error: error.message,
            stack: error.stack,
            orderData: orderData
        });
        throw new Error(`Failed to process order: ${error.message}`);
    }
}
});    

