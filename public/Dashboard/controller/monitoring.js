import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const MONITORING_CONFIG = {
    MAX_SIZE_MB: 50,
    THROTTLE_MS: 1000,
    WARNING_THRESHOLD: 90,
    ATTENTION_THRESHOLD: 70
};

let lastUpdate = 0;
let firebaseDatabase = null;
let databaseSizeChart = null;

// Fungsi untuk menghitung ukuran data (tetap sama)
function calculateDatabaseSize(snapshot) {
    try {
        const dataString = JSON.stringify(snapshot.val() || {});
        return dataString.length / (1024 * 1024); // Konversi ke MB
    } catch (error) {
        console.error('Error menghitung ukuran database:', error);
        return 0;
    }
}

// Fungsi inisialisasi Firebase (tetap sama)
async function initializeFirebase() {
    try {
        const response = await fetch('/firebase-config');
        if (!response.ok) throw new Error('Gagal memuat konfigurasi Firebase');
        const firebaseConfig = await response.json();

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const database = getDatabase(app);
        
        firebaseDatabase = database;
        
        await setupDatabaseMonitoring(database);
        
        return database;
    } catch (error) {
        console.error('Error inisialisasi Firebase:', error);
        throw error;
    }
}

// Fungsi monitoring database (tetap sama)
async function setupDatabaseMonitoring(database) {
    if (!database) {
        throw new Error('Referensi database belum diinisialisasi');
    }

    const rootRef = ref(database, '/');
    
    onValue(rootRef, async (snapshot) => {
        try {
            const now = Date.now();
            if (now - lastUpdate < MONITORING_CONFIG.THROTTLE_MS) return;
            lastUpdate = now;

            const dataSizeInMB = calculateDatabaseSize(snapshot);
            const usagePercentage = (dataSizeInMB / MONITORING_CONFIG.MAX_SIZE_MB) * 100;

            await updateMonitoringUI(dataSizeInMB, usagePercentage);

            if (usagePercentage >= MONITORING_CONFIG.WARNING_THRESHOLD) {
                await showWarningAlert();
            }
        } catch (error) {
            console.error('Error dalam monitoring database:', error);
            handleMonitoringError(error);
        }
    }, {
        onlyOnce: false // Memastikan monitoring tetap berjalan
    });
}

function updateMonitoringUI(size, percentage) {
    const statusContainer = document.getElementById('status-database');
    const chartContainer = document.getElementById('database-chart');

    if (!statusContainer || !chartContainer) {
        console.error('Container status-database atau database-chart tidak ditemukan');
        return;
    }

    // Konfigurasi status berdasarkan persentase
    const getStatusConfig = (percentage) => {
        if (percentage >= MONITORING_CONFIG.WARNING_THRESHOLD) {
            return { 
                class: 'bg-red-100 text-red-800', 
                text: 'Database Kritis', 
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)'
            };
        } else if (percentage >= MONITORING_CONFIG.ATTENTION_THRESHOLD) {
            return { 
                class: 'bg-yellow-100 text-yellow-800', 
                text: 'Perhatian', 
                borderColor: 'rgba(255, 206, 86, 1)',
                backgroundColor: 'rgba(255, 206, 86, 0.2)'
            };
        }
        return { 
            class: 'bg-green-100 text-green-800', 
            text: 'Normal', 
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)'
        };
    };

    const status = getStatusConfig(percentage);
    const remainingSize = MONITORING_CONFIG.MAX_SIZE_MB - size;

    // Container utama dengan layout fleksibel
    const containerHTML = `
        <div class="flex items-center bg-white rounded-lg shadow-lg p-4 space-x-4">
            <div id="chart-wrapper" class="w-1/3 max-w-[500px]">
                <canvas id="database-chart-canvas"></canvas>
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-lg font-semibold text-gray-800">Status Database</h3>
                    <span class="px-2 py-1 rounded-full text-sm ${status.class}">
                        ${status.text}
                    </span>
                </div>
                <div class="space-y-2 text-sm text-gray-700">
                    <div class="flex justify-between">
                        <span>Kapasitas Total:</span>
                        <span>${MONITORING_CONFIG.MAX_SIZE_MB} MB</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Terpakai:</span>
                        <span>${size.toFixed(2)} MB</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Tersisa:</span>
                        <span>${remainingSize.toFixed(2)} MB</span>
                    </div>
                    <div class="flex justify-between font-semibold">
                        <span>Penggunaan:</span>
                        <span>${percentage.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    statusContainer.innerHTML = containerHTML;

    // Inisialisasi atau update Chart
    const ctx = document.getElementById('database-chart-canvas');
    
    if (!databaseSizeChart) {
        databaseSizeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Terpakai', 'Tersisa'],
                datasets: [{
                    data: [size, remainingSize],
                    backgroundColor: [
                        status.backgroundColor,
                        // Warna-warna menarik dan profesional
                        'rgba(54, 162, 235, 0.2)',   // Soft Blue
                        // 'rgba(255, 206, 86, 0.2)',   // Soft Yellow
                        // 'rgba(75, 192, 192, 0.2)',   // Soft Teal
                        // 'rgba(153, 102, 255, 0.2)',  // Soft Purple
                        // 'rgba(255, 159, 64, 0.2)'    // Soft Orange
                    ],
                    borderColor: [
                        status.borderColor,
                        // Warna border yang sesuai
                        // 'rgba(54, 162, 235, 1)',     // Blue
                        // 'rgba(255, 206, 86, 1)',     // Yellow
                        // 'rgba(75, 192, 192, 1)',     // Teal
                        'rgba(153, 102, 255, 1)',    // Purple
                        // 'rgba(255, 159, 64, 1)'      // Orange
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.formattedValue} MB`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Update data existing chart
        databaseSizeChart.data.datasets[0].data = [size, remainingSize];
        databaseSizeChart.data.datasets[0].backgroundColor = [
            status.backgroundColor,
            'rgba(201, 203, 207, 0.2)'
        ];
        databaseSizeChart.data.datasets[0].borderColor = [
            status.borderColor,
            'rgba(201, 203, 207, 1)'
        ];
        databaseSizeChart.update();
    }
}

// Fungsi lainnya tetap sama seperti kode sebelumnya

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeFirebase();
    } catch (error) {
        console.error('Gagal menginisialisasi Firebase:', error);
        handleMonitoringError(error);
    }
});

export { initializeFirebase, setupDatabaseMonitoring };