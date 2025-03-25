window.TestimonialManager = {
    async fetchTestimonials() {
        try {
            const response = await fetch('/fetch-testimonials');
            const result = await response.json();

            const container = document.getElementById('testi-card');
            container.innerHTML = '';

            result.data.forEach(item => {
                const card = `
                <div class="bg-[#3e1e04] rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div class="p-6">
                        <!-- Header dengan ikon dan nama produk -->
                        <div class="flex items-start gap-4 mb-5">
                            <div class="bg-amber-100 p-3 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold text-white">${item.produk}</h3>
                                <p class="text-amber-600 font-medium">${item.kategori || 'Menu Favorit'}</p>
                            </div>
                        </div>

                        <!-- Testimoni -->
                        <div class="relative mb-6">
                            <p class="text-white text-start italic pl-5 pt-3">${item.testimoni}</p>
                        </div>

                        <!-- User profile -->
                        <div class="flex items-center border-t border-gray-100 pt-4">
                            <img class="w-10 h-10 rounded-full object-cover border-2 border-amber-200" src="${item.foto || 'https://randomuser.me/api/portraits/lego/5.jpg'}" alt="${item.nama}">
                            <div class="ml-3">
                                <p class="text-sm font-bold text-white">${item.nama}</p>
                                <div class="flex items-center">
                                    ${this.generateRatingStars(item.rating || 5)}
                                    <span class="text-xs text-gray-500 ml-1">(${item.rating || '5'}/5)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
                container.innerHTML += card;
            });
        } catch (error) {
            console.error('Gagal mengambil testimonial:', error);
            container.innerHTML = `
                <div class="col-span-full bg-amber-50 p-6 rounded-xl text-center border border-amber-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 class="text-lg font-medium text-amber-800 mt-3">Gagal memuat testimonial</h3>
                    <p class="text-amber-600">Silakan refresh halaman atau coba lagi nanti</p>
                </div>
            `;
        }
    },

    generateRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += `<svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
        }
        
        if (hasHalfStar) {
            stars += `<svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clip-rule="evenodd" fill-rule="evenodd"></path></svg>`;
        }
        
        for (let i = 0; i < 5 - Math.ceil(rating); i++) {
            stars += `<svg class="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
        }
        
        return stars;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.TestimonialManager.fetchTestimonials();
});