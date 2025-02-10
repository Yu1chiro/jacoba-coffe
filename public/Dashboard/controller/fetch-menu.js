import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, remove, update, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

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

getFirebaseConfig().then(firebaseConfig => {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const ordersList = document.getElementById('list-orders');

    function fetchAllOrders() {
        const ordersRef = ref(database, 'customer-orders');
        
        onValue(ordersRef, (snapshot) => {
            const allOrders = snapshot.val();
            if (!allOrders) {
                ordersList.innerHTML = '<tr><td colspan="7" class="text-center py-4">Tidak ada pesanan</td></tr>';
                return;
            }

            let allOrdersArray = [];
            Object.entries(allOrders).forEach(([userId, userOrders]) => {
                Object.entries(userOrders).forEach(([orderId, orderData]) => {
                    allOrdersArray.push({
                        userId,
                        orderId,
                        timestamp: parseInt(orderId),
                        ...orderData
                    });
                });
            });

            allOrdersArray.sort((a, b) => b.timestamp - a.timestamp);

            let tableContent = '';
            allOrdersArray.forEach(order => {
                const timestamp = new Date(order.timestamp).toLocaleString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const items = order.items || {};
                const itemsList = Object.values(items)
                    .map(item => `${item.name} (${item.quantity}x)`)
                    .join('<br>');

                const totalPrice = Object.values(items)
                    .reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

                let statusClass = '';
                switch (order.status?.toLowerCase()) {
                    case 'sedang di proses':
                        statusClass = 'bg-yellow-100 text-yellow-800';
                        break;
                    case 'pesanan siap':
                        statusClass = 'bg-green-100 text-green-800';
                        break;
                    default:
                        statusClass = 'bg-gray-100 text-gray-800';
                }
               
                tableContent += `
                    <tr class="border-b hover:bg-gray-50">
    <td class="text-center py-2 px-3 text-sm">${timestamp}</td>
    <td class="text-center py-2 px-3 text-sm">${itemsList}</td>
    <td class="text-center py-2 px-3 text-sm">Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</td>
    <td class="text-center py-2 px-3">
        <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
            ${order.status || 'Pending'}
        </span>
    </td>
    <td class="text-center py-2 px-3 text-sm">${order.paymentMethod || '-'}</td>
    <td class="text-center py-2 px-3">
        <div class="flex justify-center space-x-1">
            <button onclick="showOrderDetails('${order.userId}', '${order.orderId}')"
                class="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600">
                Detail
            </button>
           <div class="relative">
            <button onclick="toggleStatusOptions(this)" 
                class="bg-gray-500 text-white text-sm px-3 py-1 rounded hover:bg-gray-600">
                Update
            </button>
            <div class="absolute left-0 top-full mt-2 bg-white border rounded shadow-md z-50 hidden status-options">
                <button onclick="updateOrderStatus('${order.userId}', '${order.orderId}', 'sedang di proses')" 
                    class="block w-full px-4 py-2 text-sm hover:bg-gray-100">Sedang di Proses</button>
                <button onclick="updateOrderStatus('${order.userId}', '${order.orderId}', 'pesanan siap')" 
                    class="block w-full px-4 py-2 text-sm hover:bg-gray-100">Pesanan Siap</button>
            </div>
        </div>
            <button onclick="deleteOrder('${order.userId}', '${order.orderId}')"
                class="bg-red-500 text-white text-sm px-3 py-1 rounded hover:bg-red-600">
                Hapus
            </button>
        </div>
    </td>
</tr>

                `;
            });

            ordersList.innerHTML = tableContent;
        });
    }
    window.toggleStatusOptions = function(button) {
        const dropdown = button.nextElementSibling;
        dropdown.classList.toggle('hidden');
    
        function hideDropdown(e) {
            if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', hideDropdown);
            }
        }
    
        setTimeout(() => document.addEventListener('click', hideDropdown), 0);
    };
    
    
    function updateOrderStatus(userId, orderId, newStatus) {
        if (!newStatus) return;

        const orderRef = ref(database, `customer-orders/${userId}/${orderId}`);
        // Hanya update status saja
        update(orderRef, { status: newStatus })
            .then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Status pesanan berhasil diperbarui',
                    timer: 1500,
                    showConfirmButton: false
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Gagal memperbarui status: ' + error.message
                });
            });
    }

    function deleteOrder(userId, orderId) {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Pesanan yang dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                const orderRef = ref(database, `customer-orders/${userId}/${orderId}`);
                remove(orderRef)
                    .then(() => {
                        Swal.fire(
                            'Terhapus!',
                            'Pesanan berhasil dihapus.',
                            'success'
                        );
                    })
                    .catch(error => {
                        Swal.fire(
                            'Error!',
                            'Gagal menghapus pesanan: ' + error.message,
                            'error'
                        );
                    });
            }
        });
    }

    function showOrderDetails(userId, orderId) {
        const orderRef = ref(database, `customer-orders/${userId}/${orderId}`);
        
        get(orderRef).then(snapshot => {
            const orderData = snapshot.val();
            
            if (orderData) {
                let itemsHTML = '';
                let totalPrice = 0;
                let customerName = '';
                let tableNumber = '';
                
                // Fetch customer info from the first item
                if (orderData.items) {
                    const firstItemKey = Object.keys(orderData.items)[0];
                    const firstItem = orderData.items[firstItemKey];
                    if (firstItem && firstItem.customerInfo) {
                        customerName = firstItem.customerInfo.name || '';
                        tableNumber = firstItem.customerInfo.tableNumber || '';
                    }
                }
    
                // Process items and calculate total
                Object.values(orderData.items || {}).forEach(item => {
                    const itemTotal = item.price * (item.quantity || 1);
                    totalPrice += itemTotal;
                    itemsHTML += `
                        <div class="flex items-center space-x-4">
                            <img src="${item.thumbnail || 'fallback-image.jpg'}" alt="${item.name}" class="w-16 h-16 rounded">
                            <div>
                                <div class="font-semibold">${item.name}</div>
                                <div>Jumlah: ${item.quantity}</div>
                                <div>Harga: Rp ${new Intl.NumberFormat('id-ID').format(item.price)}</div>
                            </div>
                        </div>
                    `;
                });
    
                // Tambahkan tombol lihat bukti pembayaran jika metode pembayaran QRIS
                const paymentProofButton = orderData.paymentMethod === 'QRIS' ? `
                    <button onclick="showPaymentProof('${orderData.paymentProof}')" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-4">
                        Lihat Bukti Pembayaran
                    </button>
                ` : '';
    
                // Display modal with customer info, items, and payment proof button
                Swal.fire({
                    title: 'Detail Pesanan',
                    html: `
                        <div class="bg-gray-100 p-4 mb-4 rounded">
                            <div class="font-semibold mb-2">Informasi Pelanggan:</div>
                            <div>Nama: ${customerName}</div>
                            <div>Nomor Meja: ${tableNumber}</div>
                            <div>Metode Pembayaran: ${orderData.paymentMethod || '-'}</div>
                        </div>
                        <div class="space-y-2">
                            ${itemsHTML}
                            <div class="flex justify-between items-center pt-4 border-t font-semibold">
                                <div>Total:</div>
                                <div>Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}</div>
                            </div>
                        </div>
                        ${paymentProofButton}
                    `,
                    width: 600,
                    showCloseButton: true,
                    showConfirmButton: false,
                    customClass: {
                        htmlContainer: 'text-left'
                    }
                });
            }
        }).catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Gagal memuat detail pesanan'
            });
            console.error('Error fetching order details:', error);
        });
    }
    
    // Fungsi untuk menampilkan bukti pembayaran dalam modal baru
    function showPaymentProof(paymentProofBase64) {
        Swal.fire({
            title: 'Bukti Pembayaran QRIS',
            html: `
                <div class="flex justify-center">
                    <img src="${paymentProofBase64}" alt="Bukti Pembayaran" class="w-32 h-auto">
                </div>
            `,
            width: 600,
            showCloseButton: true,
            showConfirmButton: false
        });
    }
    window.deleteAllOrders = async function() {
        try {
            const database = getDatabase();
            const ordersRef = ref(database, 'customer-orders');
            
            // Konfirmasi penghapusan menggunakan SweetAlert
            const result = await Swal.fire({
                title: 'Hapus Semua Pesanan?',
                text: 'Anda tidak dapat mengembalikan data yang sudah dihapus!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Hapus Semua!',
                cancelButtonText: 'Batal'
            });
            
            if (result.isConfirmed) {
                await remove(ordersRef);
                
                // Notifikasi sukses menggunakan SweetAlert
                Swal.fire(
                    'Terhapus!',
                    'Semua pesanan telah berhasil dihapus.',
                    'success'
                );
            }
        } catch (error) {
            // Notifikasi error menggunakan SweetAlert
            Swal.fire(
                'Gagal!',
                'Terjadi kesalahan saat menghapus pesanan.',
                'error'
            );
            console.error('Gagal menghapus pesanan:', error);
        }
    };
    
    // Tambahkan event listener pada tombol
    document.getElementById('remove-allorders').addEventListener('click', window.deleteAllOrders);
    // Pastikan fungsi showPaymentProof tersedia secara global
    window.showPaymentProof = showPaymentProof;

    window.updateOrderStatus = updateOrderStatus;
    window.deleteOrder = deleteOrder;
    window.showOrderDetails = showOrderDetails;

    fetchAllOrders();
});