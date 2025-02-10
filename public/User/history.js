import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, onValue, remove, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

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
    const auth = getAuth(app);
    const database = getDatabase(app);

    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('userPhoto').src = user.photoURL;
            document.getElementById('userName').textContent = user.displayName;
            initializeOrderMonitor(user.uid);
        } else {
            window.location.href = '/';
        }
    });

    function initializeOrderMonitor(userId) {
        const database = getDatabase();
        const ordersContainer = document.getElementById('history-user');
        
        // Mengubah referensi untuk hanya mengambil pesanan pengguna yang login
        const userOrdersRef = ref(database, `customer-orders/${userId}`);
        
        onValue(userOrdersRef, (snapshot) => {
            const userOrders = snapshot.val();
            if (!userOrders) {
                ordersContainer.innerHTML = '<p class="text-center p-4">Belum ada pesanan.</p>';
                return;
            }

            let tableHTML = `
                <div class="overflow-auto w-full">
    <table class="w-full border-collapse">
        <thead>
            <tr class="bg-gray-100 text-xs md:text-sm text-gray-700">
                <th class="border p-2 md:p-4">Waktu Pesanan</th>
                <th class="border p-2 md:p-4">Item</th>
                <th class="border p-2 md:p-4">Total</th>
                <th class="border p-2 md:p-4">Status</th>
            </tr>
        </thead>
        <tbody>

            `;

            const orders = [];
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
                    case 'sedang di proses':
                        statusClass = 'bg-green-100 text-white-800';
                        break;
                    case 'pesanan siap':
                        statusClass = 'bg-green-600 text-white';
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
                   <tr class="hover:bg-gray-50 text-xs md:text-sm lg:text-base">
    <td class="border p-2 md:p-4 whitespace-nowrap text-center">${orderTime}</td>
    <td class="border p-2 md:p-4 text-center">${itemsList}</td>
    <td class="border p-2 md:p-4 text-center">Rp ${new Intl.NumberFormat('id-ID').format(order.total)}</td>
    <td class="border p-2 md:p-4 text-center">
        <span class="px-2 py-1 rounded-full text-xs md:text-sm capitalize ${statusClass}">
            ${order.status}
        </span>
    </td>
</tr>

                `;
            });

            tableHTML += '</tbody></table>';
            ordersContainer.innerHTML = tableHTML;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const user = auth.currentUser;
        if (user) {
            initializeOrderMonitor(user.uid);
        }
    });
});