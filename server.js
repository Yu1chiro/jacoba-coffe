import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const __dirname = path.resolve();

app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

app.get('/firebase-config', (req, res) => {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  res.json(firebaseConfig);
});

app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
}));

// Handler untuk rute yang tidak ditemukan - moved before app.listen()
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 Not Found</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[url('/img/pixel.jpg')] bg-cover bg-no-repeat flex items-center justify-center min-h-screen">
  <div class="bg-gradient-to-r from-[#0a387f] to-[#1C1678] animate-card text-white rounded-lg shadow-md p-6 mx-auto max-w-lg">
    <h1 class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(42,85%,65%)] to-[hsl(42,80%,85%)] text-center text-2xl mb-4 font-custom">
      404 Page Not Found
    </h1>
    <p class="text-center mb-6">
      Sepertinya halaman yang Anda cari tidak tersedia
    </p>
    <div class="flex justify-center">
      <a href="/" class="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition">
        Kembali ke Beranda
      </a>
    </div>
  </div>
</body>

</html>
    `);
});

// Start the server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));