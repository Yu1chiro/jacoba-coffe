import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

async function getFirebaseConfig() {
    try {
        const response = await fetch('/firebase-config');
        if (!response.ok) throw new Error('Gagal memuat konfigurasi Firebase');
        return response.json();
    } catch (error) {
        console.error('Error inisialisasi Firebase:', error);
        throw new Error('Gagal memuat konfigurasi Firebase');
    }
}

getFirebaseConfig().then(firebaseConfig => {
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    function analyzeWeeklySales() {
        const ordersRef = ref(database, 'customer-orders');
        
        onValue(ordersRef, (snapshot) => {
            const allOrders = snapshot.val();
            if (!allOrders) {
                console.log('Tidak ada pesanan');
                return;
            }

            // Analisis statistik penjualan mingguan
            const productSales = {};
            const customerPurchases = {};
            const salesByDay = {};
            const dailyRevenue = {};
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

            // Proses setiap pesanan
            Object.entries(allOrders).forEach(([userId, userOrders]) => {
                Object.entries(userOrders).forEach(([orderId, orderData]) => {
                    // Filter pesanan dalam seminggu terakhir
                    if (parseInt(orderId) >= oneWeekAgo) {
                        const orderDate = new Date(parseInt(orderId)).toLocaleDateString('id-ID');
                        
                        // Ambil nama pelanggan dari customerInfo
                        const customerName = orderData.items ? 
                            Object.values(orderData.items)[0].customerInfo?.name || 'Pelanggan Tidak Dikenal' 
                            : 'Pelanggan Tidak Dikenal';

                        // Hitung pembelian per produk
                        Object.values(orderData.items || {}).forEach(item => {
                            const productName = item.name;
                            productSales[productName] = (productSales[productName] || 0) + (item.quantity || 1);
                            
                            // Hitung pembelian per pelanggan
                            if (!customerPurchases[customerName]) {
                                customerPurchases[customerName] = {
                                    count: 0,
                                    totalSpent: 0
                                };
                            }
                            customerPurchases[customerName].count++;
                            customerPurchases[customerName].totalSpent += item.price * (item.quantity || 1);
                        });

                        // Hitung penjualan dan pendapatan per hari
                        salesByDay[orderDate] = (salesByDay[orderDate] || 0) + 1;
                        dailyRevenue[orderDate] = (dailyRevenue[orderDate] || 0) + 
                            Object.values(orderData.items || {}).reduce((sum, item) => 
                                sum + (item.price * (item.quantity || 1)), 0);
                    }
                });
            });

            // Urutkan produk berdasarkan jumlah penjualan
            const topProducts = Object.entries(productSales)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            // Urutkan pelanggan berdasarkan frekuensi pembelian
            const topCustomers = Object.entries(customerPurchases)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);

            // Render grafik dan statistik
            renderProductPieChart(topProducts);
            renderDailyRevenueBarChart(dailyRevenue);
            renderTopCustomersTable(topCustomers);
            displayDailySalesSummary(salesByDay, dailyRevenue);
        });
    }

    function renderProductPieChart(topProducts) {
        const ctx = document.getElementById('productSalesPieChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: topProducts.map(product => product[0]),
                datasets: [{
                    data: topProducts.map(product => product[1]),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Produk Terlaris Minggu Ini'
                    }
                }
            }
        });
    }

    function renderDailyRevenueBarChart(dailyRevenue) {
        const ctx = document.getElementById('dailyRevenueBarChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(dailyRevenue),
                datasets: [{
                    label: 'Pendapatan Harian',
                    data: Object.values(dailyRevenue),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Pendapatan (Rp)'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('id-ID').format(value);
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Pendapatan Harian Minggu Ini'
                    }
                }
            }
        });
    }

    function renderTopCustomersTable(topCustomers) {
        const tableBody = document.getElementById('topCustomersTableBody');
        tableBody.innerHTML = '';

        topCustomers.forEach(([customerName, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-2 border">${customerName}</td>
                <td class="px-4 py-2 border text-center">${data.count}</td>
                <td class="px-4 py-2 border text-right">Rp ${new Intl.NumberFormat('id-ID').format(data.totalSpent)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function displayDailySalesSummary(salesByDay, dailyRevenue) {
        const summaryContainer = document.getElementById('dailySalesSummary');
        const totalOrders = Object.values(salesByDay).reduce((sum, count) => sum + count, 0);
        const totalRevenue = Object.values(dailyRevenue).reduce((sum, revenue) => sum + revenue, 0);

        summaryContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-100 p-4 rounded">
                    <h3 class="font-semibold">Total Pesanan</h3>
                    <p class="text-2xl">${totalOrders}</p>
                </div>
                <div class="bg-green-100 p-4 rounded">
                    <h3 class="font-semibold">Total Pendapatan</h3>
                    <p class="text-2xl">Rp ${new Intl.NumberFormat('id-ID').format(totalRevenue)}</p>
                </div>
            </div>
        `;
    }

    // Panggil fungsi analisis
    analyzeWeeklySales();
    window.analyzeWeeklySales = analyzeWeeklySales;
    function downloadWeeklySalesReport() {
        const ordersRef = ref(database, 'customer-orders');
        
        onValue(ordersRef, (snapshot) => {
            const allOrders = snapshot.val();
            if (!allOrders) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tidak Ada Data',
                    text: 'Tidak terdapat data penjualan untuk diunduh.'
                });
                return;
            }
    
            // Analisis data penjualan
            const productSales = {};
            const customerPurchases = {};
            const salesByDay = {};
            const dailyRevenue = {};
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
            // Proses setiap pesanan
            Object.entries(allOrders).forEach(([userId, userOrders]) => {
                Object.entries(userOrders).forEach(([orderId, orderData]) => {
                    if (parseInt(orderId) >= oneWeekAgo) {
                        const orderDate = new Date(parseInt(orderId)).toLocaleDateString('id-ID');
                        
                        // Nama pelanggan
                        const customerName = orderData.items ? 
                            Object.values(orderData.items)[0].customerInfo?.name || 'Pelanggan Tidak Dikenal' 
                            : 'Pelanggan Tidak Dikenal';
    
                        // Analisis produk
                        Object.values(orderData.items || {}).forEach(item => {
                            const productName = item.name;
                            productSales[productName] = (productSales[productName] || 0) + (item.quantity || 1);
                            
                            // Pelanggan dan total belanja
                            if (!customerPurchases[customerName]) {
                                customerPurchases[customerName] = {
                                    count: 0,
                                    totalSpent: 0,
                                    lastPurchaseDate: orderDate
                                };
                            }
                            customerPurchases[customerName].count++;
                            customerPurchases[customerName].totalSpent += item.price * (item.quantity || 1);
                            customerPurchases[customerName].lastPurchaseDate = orderDate;
                        });
    
                        // Penjualan dan pendapatan harian
                        salesByDay[orderDate] = (salesByDay[orderDate] || 0) + 1;
                        dailyRevenue[orderDate] = (dailyRevenue[orderDate] || 0) + 
                            Object.values(orderData.items || {}).reduce((sum, item) => 
                                sum + (item.price * (item.quantity || 1)), 0);
                    }
                });
            });
    
            // Persiapkan data untuk Excel
            const workbook = XLSX.utils.book_new();
    
            // Hitung total statistik
            const totalOrders = Object.values(salesByDay).reduce((sum, count) => sum + count, 0);
            const totalRevenue = Object.values(dailyRevenue).reduce((sum, revenue) => sum + revenue, 0);
            
            // Produk Terlaris
            const topProducts = Object.entries(productSales)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
    
            // Pelanggan Teratas
            const topCustomers = Object.entries(customerPurchases)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);
    
            // Data untuk laporan
            const reportData = [
                // Informasi Umum
                ["LAPORAN PENJUALAN MINGGUAN", ""],
                ["Periode", `${new Date(oneWeekAgo).toLocaleDateString('id-ID')} - ${new Date().toLocaleDateString('id-ID')}`],
                ["", ""],
    
                // Ringkasan Penjualan
                ["RINGKASAN PENJUALAN", ""],
                ["Total Pesanan", totalOrders],
                ["Total Pendapatan", `Rp ${new Intl.NumberFormat('id-ID').format(totalRevenue)}`],
                ["Rata-rata Pesanan per Hari", `${(totalOrders / 7).toFixed(2)}`],
                ["Rata-rata Pendapatan per Hari", `Rp ${new Intl.NumberFormat('id-ID').format(totalRevenue / 7)}`],
                ["", ""],
    
                // Produk Terlaris
                ["TOP 5 PRODUK TERLARIS", ""],
                ...topProducts.map(([ product, quantity ], index) => [
                    `${index + 1}. ${product}`, 
                    `${quantity} pcs`
                ]),
                ["", ""],
    
                // Pelanggan Teratas
                ["TOP 5 PELANGGAN", ""],
                ...topCustomers.map(([name, data], index) => [
                    `${index + 1}. ${name}`, 
                    `${data.count} pesanan (Rp ${new Intl.NumberFormat('id-ID').format(data.totalSpent)})`
                ]),
                ["", ""],
    
                // Penjualan Harian
                ["PENJUALAN HARIAN", ""],
                ...Object.entries(dailyRevenue).map(([date, revenue]) => [
                    date, 
                    `Rp ${new Intl.NumberFormat('id-ID').format(revenue)}`
                ])
            ];
    
            // Buat worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(reportData);
    
            // Style untuk judul dan header
            const headerStyle = {
                font: { bold: true, sz: 14 },
                alignment: { horizontal: "center" }
            };
    
            // Terapkan gaya pada sel-sel tertentu
            const sectionHeaders = [
                "LAPORAN PENJUALAN MINGGUAN", 
                "RINGKASAN PENJUALAN", 
                "TOP 5 PRODUK TERLARIS", 
                "TOP 5 PELANGGAN", 
                "PENJUALAN HARIAN"
            ];
    
            sectionHeaders.forEach(header => {
                const cell = Object.keys(worksheet).find(cell => 
                    worksheet[cell] && worksheet[cell].v === header
                );
                if (cell) {
                    worksheet[cell].s = headerStyle;
                }
            });
    
            // Tambahkan worksheet ke workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');
    
            // Simpan file Excel
            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Laporan_Penjualan_Mingguan_${today}.xlsx`);
    
            // Notifikasi berhasil
            Swal.fire({
                icon: 'success',
                title: 'Unduhan Berhasil',
                text: 'Laporan statistik penjualan mingguan telah diunduh.',
                timer: 2000,
                showConfirmButton: false
            });
        });
    }
    
    // Tambahkan event listener ke tombol download
    document.getElementById('download-statistic').addEventListener('click', downloadWeeklySalesReport);
});
// Tambahkan ke window untuk akses global jika diperlukan