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
            initializeOrderMonitor();
        } else {
            window.location.href = '/';
        }
    });

    function initializeOrderMonitor() {
        const database = getDatabase();
        const ordersContainer = document.getElementById('history-user');
        const auth = getAuth();
    
        onAuthStateChanged(auth, (user) => {
            if (!user) return;
    
            const ordersRef = ref(database, 'customer-orders');
            
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
                                <th class="border p-2">Items</th>
                                <th class="border p-2">Total</th>
                                <th class="border p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
    
                const orders = [];
                Object.entries(allOrders).forEach(([userId, userOrders]) => {
                    Object.entries(userOrders).forEach(([orderId, orderData]) => {
                        let totalPrice = 0;
                        if (orderData.items) {
                            Object.values(orderData.items).forEach(item => {
                                totalPrice += (item.price * (item.quantity || 1));
                            });
                        }
                        orders.push({
                            orderId,
                            timestamp: parseInt(orderId),
                            items: orderData.items || {},
                            total: totalPrice,
                            status: orderData.status || 'pending'
                        });
                    });
                });
    
                orders.sort((a, b) => b.timestamp - a.timestamp);
    
                orders.forEach(order => {
                    const orderTime = new Date(order.timestamp).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
    
                    let itemsList = '';
                    Object.values(order.items).forEach(item => {
                        itemsList += `${item.name} (${item.quantity}x Rp ${new Intl.NumberFormat('id-ID').format(item.price)})<br>`;
                    });
    
                    let statusClass = '';
                    switch (order.status.toLowerCase()) {
                        case 'pesanan di proses':
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
                            <td class="border p-2">${itemsList}</td>
                            <td class="border p-2">Rp ${new Intl.NumberFormat('id-ID').format(order.total)}</td>
                            <td class="border p-2">
                                <span class="px-2 py-1 rounded-full text-sm ${statusClass} capitalize">
                                    ${order.status}
                                </span>
                            </td>
                        </tr>
                    `;
                });
    
                tableHTML += '</tbody></table>';
                ordersContainer.innerHTML = tableHTML;
            });
        });
    }
    
    

// Initialize the monitor when the page loads
document.addEventListener('DOMContentLoaded', initializeOrderMonitor);
});
