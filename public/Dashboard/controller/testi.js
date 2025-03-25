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
                        <button
    onclick="window.TestimonialManager.deleteRecord(${item.Id})"
    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-300"
>
    Hapus
</button>
                    </td>
                </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Gagal mengambil testimonial:', error);
            alert('Gagal memuat testimonial');
        }
    },
    async deleteRecord(Id) {
        try {
            console.log('[Client] Attempting to delete Id:', Id, 'Type:', typeof Id);
            
            // ValIdasi Id
            if (!Id || isNaN(Id)) {
                throw new Error('InvalId Id format');
            }
    
            const response = await fetch('/api/records', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    Id: Number(Id) // Pastikan berupa number dan huruf I besar
                })
            });
    
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Delete failed');
            }
    
            alert('Data berhasil dihapus!');
            await this.fetchTestimonials();
        } catch (error) {
            console.error('[Client] Delete error:', {
                error: error.message,
                stack: error.stack,
                inputId: Id
            });
            alert(`Gagal menghapus: ${error.message}`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.TestimonialManager.fetchTestimonials();
});