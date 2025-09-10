window.TestimonialManager = {
    async fetchTestimonials() {
        try {
            const response = await fetch('/fetch-testimonials');
            const result = await response.json();

            const tableBody = document.getElementById('testimonial-table-body');
            tableBody.innerHTML = ''; 

            result.data.forEach(item => {
                const row = `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3">${item.nama}</td>
                    <td class="p-3">${item.produk}</td>
                    <td class="p-3">${item.testimoni}</td>
                    <td class="p-3">
                    </td>
                </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Gagal mengambil testimonial:', error);
            alert('Gagal memuat testimonial');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.TestimonialManager.fetchTestimonials();
});