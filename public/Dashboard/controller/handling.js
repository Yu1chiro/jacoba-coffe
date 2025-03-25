  

document.getElementById('add-bestseller').addEventListener('click', function() {
        Swal.fire({
            title: 'Tambah Produk Bestseller',
            html: `
<div class='max-w-lg text-start mx-auto bg-white p-6 rounded-lg shadow-md'>
    <form id="bestseller-product">
        <div class='mb-4'>
            <label class='block text-gray-700 font-medium mb-2'>Nama Produk</label>
            <input type='text' id="best-name" class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan nama produk'>
        </div>
        <div class='mb-4'>
            <label class='block text-gray-700 font-medium mb-2'>Thumbnail Produk</label>
            <input type='file' id="best-thumbnail" class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' accept='image/*'>
        </div>
        <div class='mb-4'>
            <label class='block text-gray-700 font-medium mb-2'>Kategori</label>
            <select id="best-category" class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>
                <option value=''>Pilih Kategori</option>
                <option value='Makanan'>Makanan</option>
                <option value='Snack'>Snack</option>
                <option value='Minuman'>Minuman</option>
            </select>
        </div>
        <div class='mb-4'>
            <label class='block text-gray-700 font-medium mb-2'>Varian</label>
            <input type='text' id="best-variant" class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan jenis varian produk jika ada'>
        </div>
        <div class='mb-4'>
            <label class='block text-gray-700 font-medium mb-2'>Harga</label>
            <input type='number' id="best-price" class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan harga'>
        </div>
        <button type='submit' id="best-submit" class='w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600'>Tambah Produk</button>
    </form>
</div>

            `,
            showConfirmButton: false,
        });
    });
    // List Menu
    document.getElementById('add-product').addEventListener('click', function() {
        Swal.fire({
            title: 'Tambah Produk',
            html: `
                <div class='max-w-lg text-start mx-auto bg-white p-6 rounded-lg shadow-md'>
                    <form>
    <div class='mb-4'>
        <label class='block text-gray-700 font-medium mb-2'>Nama Produk</label>
        <input type='text' class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan nama produk'>
    </div>
    <div class='mb-4'>
        <label class='block text-gray-700 font-medium mb-2'>Thumbnail Produk</label>
        <input type='file' class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' accept='image/*'>
    </div>
    <div class='mb-4'>
        <label class='block text-gray-700 font-medium mb-2'>Kategori</label>
        <select class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>
            <option value=''>Pilih Kategori</option>
            <option value='Makanan'>Makanan</option>
            <option value='Snack'>Snack</option>
            <option value='Minuman'>Minuman</option>
        </select>
    </div>
    <div class='mb-4'>
        <label class='block text-gray-700 font-medium mb-2'>Varian</label>
        <input type='text' class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan Jenis varian produk jika ada'>
    </div>
    <div class='mb-4'>
        <label class='block text-gray-700 font-medium mb-2'>Harga</label>
        <input type='number' class='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' placeholder='Masukkan harga'>
    </div>
    <button type='submit' class='w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600'>Tambah Produk</button>
</form>

                </div>
            `,
            showConfirmButton: false,
        });
    });
