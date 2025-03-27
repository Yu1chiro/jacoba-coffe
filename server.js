import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import {rateLimit} from 'express-rate-limit';
import {RateLimiterMemory} from 'rate-limiter-flexible';
import axios from "axios";


// Simpan token aktif (gunakan database di production)
dotenv.config();
const app = express();
const __dirname = path.resolve();

// Inisialisasi Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

const firebaseAdmin = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Middleware untuk cache control
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

// Middleware untuk verifikasi autentikasi
const authMiddleware = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';
    if (!sessionCookie) {
      return res.redirect('/403');
    }

    const decodedClaim = await getAuth().verifySessionCookie(sessionCookie, true);
    const userRecord = await getAuth().getUser(decodedClaim.uid);

    // Verifikasi role admin
    const db = getDatabase();
    const adminRef = db.ref(`admin/${userRecord.uid}`);
    const adminSnapshot = await adminRef.once('value');
    
    if (!adminSnapshot.exists() || adminSnapshot.val().role !== 'admin') {
      return res.redirect('/403');
    }

    req.user = userRecord;
    next();
  } catch (error) {
    console.error('Verifikasi sesi gagal:', error);
    res.redirect('/403');
  }


};

// Middleware untuk parsing cookie
app.use(express.json());
app.use(cookieParser());
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
app.get('/auth-config', (req, res) => {
  const firebaseClientConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  };

  res.json(firebaseClientConfig);
});
app.get("/asset/:id", async (req, res) => {
  const fileId = req.params.id;
  const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  try {
      const response = await axios.get(imageUrl, { responseType: "stream" });
      res.setHeader("Content-Type", response.headers["content-type"]);
      response.data.pipe(res);
  } catch (error) {
      res.status(500).send("Gambar tidak dapat di-load.");
  }
});

// Rate-limiter berbasis IP
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 percobaan login per IP
  message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.',
      retryAfter: 15 * 60, // Waktu tunggu dalam detik
    });
  },
});

// Terapkan ipLimiter secara global
// app.use(ipLimiter);
// Rate-limiter berbasis email
const emailLimiter = new RateLimiterMemory({
  points: 5, // Maksimal 5 percobaan
  duration: 15 * 60, // 15 menit
});
app.post('/submit-testimonial', async (req, res) => {
  const { customerName, productName, testimonial } = req.body;
  
  // Validasi data di server
  if (!customerName || !productName || !testimonial) {
    return res.status(400).json({ message: 'Semua kolom harus diisi' });
  }

  if (testimonial.length > 100) {
    return res.status(400).json({ message: 'Testimonial tidak boleh lebih dari 100 karakter' });
  }

  try {
    // Format data sesuai dengan skema NocoDB yang diberikan
    const dataToSend = {
      // Id: 0, // Id mungkin auto-increment, jadi tidak perlu diinclude
      Nama: customerName,
      Produk: productName,
      Testimoni: testimonial
    };
        
    const response = await axios.post(process.env.NOCODB_API_URL, dataToSend, {
      headers: {
        'accept': 'application/json',
        'xc-token': process.env.NOCODB_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    res.status(200).json({ message: 'Testimonial submitted successfully', data: response.data });
  } catch (error) {
    console.error('Error saat mengirim testimonial ke NocoDB:', error);
    
    // Log detail error lebih lengkap
    if (error.response) {
      console.error('Data respons error:', error.response.data);
      console.error('Status error:', error.response.status);
      console.error('Headers error:', error.response.headers);
    } else if (error.request) {
      console.error('Request error:', error.request);
    }
    
    res.status(500).json({ message: 'Gagal mengirim testimonial', error: error.message });
  }
});
app.get('/fetch-testimonials',  async (req, res) => {
  try {
    const response = await axios.get(process.env.NOCODB_API_URL, {
      headers: {
        'accept': 'application/json',
        'xc-token': process.env.NOCODB_API_KEY
      },
      params: {
        limit: 25,
        offset: 0
      }
    });

    // Proses data untuk memastikan format yang konsisten
    const testimonis = response.data.list.map(item => ({
      id: item.id,
      nama: item.Nama || 'N/A',
      produk: item.Produk || 'N/A',
      testimoni: item.Testimoni || 'N/A'
    }));

    res.status(200).json({
      message: 'Testimonial berhasil diambil',
      data: testimonis
    });
  } catch (error) {
    console.error('Error saat mengambil testimonial:', error);
    
    // Tangani berbagai jenis kesalahan
    if (error.response) {
      res.status(error.response.status).json({
        message: 'Gagal mengambil testimonial',
        error: error.response.data
      });
    } else if (error.request) {
      res.status(500).json({
        message: 'Tidak ada respons dari server',
        error: error.request
      });
    } else {
      res.status(500).json({
        message: 'Kesalahan internal server',
        error: error.message
      });
    }
  }
});
// Fungsi untuk mengirim notifikasi ke Telegram
async function sendTelegramNotification(orderData) {
  try {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      const apiKey = process.env.BOT_TELEGRAM_APIKEY;
      
      // Validate required fields
      if (!orderData.paymentMethod) {
          throw new Error('Payment method is missing in order data');
      }

      // Format notification message
let message = `══════ ⋆★⋆ ══════\n`;
message += `🧾 *NEW ORDER* 🧾\n`;
message += `══════ ⋆★⋆ ══════\n\n`;
message += `📅 *DATE*: ${new Date(orderData.timestamp).toLocaleString('id-ID')}\n`;

message += `👤 *CUSTOMER*: ${orderData.customerName || 'Walk-in'}\n`;

message += `🪑 *TABLE*: ${orderData.tableNumber || 'N/A'}\n`;

message += `💳 *PAYMENT*: ${orderData.paymentMethod} ${orderData.status === 'pending' ? '⏳' : '✅'}\n\n`;

message += `══════ ⋆★⋆ ══════\n`;
message += `       🛒 *ORDER ITEMS*\n`;
message += `══════ ⋆★⋆ ══════\n`;

// Handle items (ensure it's always an array)
const items = Array.isArray(orderData.items) ? orderData.items : Object.values(orderData.items || {});
items.forEach((item, index) => {
    message += `${index + 1}. ${item.name || 'Unknown Item'}\n`;
    message += `   ${item.quantity || 1} x Rp${new Intl.NumberFormat('id-ID').format(item.price || 0)}\n`;
    if (item.notes) message += `   📝: ${item.notes}\n`;
});

message += `\n══════ ⋆★⋆ ══════\n`;
message += `💵 *SUBTOTAL*: Rp${new Intl.NumberFormat('id-ID').format(orderData.subtotal || orderData.totalPrice || 0)}\n`;
if (orderData.tax) message += `📊 *TAX (${orderData.taxRate || '10'}%)*: Rp${new Intl.NumberFormat('id-ID').format(orderData.tax || 0)}\n`;
if (orderData.serviceCharge) message += `⚡ *SERVICE*: Rp${new Intl.NumberFormat('id-ID').format(orderData.serviceCharge || 0)}\n`;
message += `💰 *TOTAL*: Rp${new Intl.NumberFormat('id-ID').format(orderData.totalPrice || 0)}\n`;
message += `══════ ⋆★⋆ ══════\n\n`;

message += `📝 *NOTES*: ${orderData.notes || orderData.orderNotes || '-'}\n\n`;
     

      // Send text message first
      const textResponse = await axios.post(`https://api.telegram.org/bot${apiKey}/sendMessage`, {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
      });

      // If QRIS and has payment proof, send the image
      if (orderData.paymentMethod === 'QRIS' && orderData.paymentProof) {
          try {
              await axios.post(`https://api.telegram.org/bot${apiKey}/sendPhoto`, {
                  chat_id: chatId,
                  photo: orderData.paymentProof,
                  caption: `Payment Proof for Order #${orderData.timestamp}`
              });
          } catch (photoError) {
              console.error('Failed to send payment proof photo:', photoError);
              // Continue even if photo fails
          }
      }

      return textResponse.data;
  } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
  }
}

app.post('/send-order-notification', async (req, res) => {
  try {
      const orderData = req.body;
      
      // Enhanced logging
      console.log('Order Data Received:', {
          paymentMethod: orderData.paymentMethod,
          customer: orderData.customerName,
          total: orderData.totalPrice,
          itemsCount: Array.isArray(orderData.items) ? orderData.items.length : 'N/A',
          hasProof: !!orderData.paymentProof
      });

      // Validate minimum required data
      if (!orderData.paymentMethod || !orderData.totalPrice) {
          return res.status(400).json({ 
              error: 'Invalid order data',
              details: 'Missing paymentMethod or totalPrice' 
          });
      }

      // Process notification
      await sendTelegramNotification(orderData);
      
      res.status(200).json({ 
          success: true,
          message: 'Notification sent successfully'
      });

  } catch (error) {
      console.error('Notification Error:', {
          error: error.message,
          stack: error.stack
      });
      res.status(500).json({ 
          error: 'Failed to send notification',
          details: error.message 
      });
  }
});
app.post('/sessionLogin', ipLimiter, async (req, res) => {
  const { idToken, email } = req.body;

  try {
    // Cek rate-limit berbasis email
    await emailLimiter.consume(email);

    const expiresIn = 60 * 60 * 24 * 1 * 1000; // 1
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

    res.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ status: 'success' });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Kesalahan membuat sesi:', error);
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
    } else {
      // Jika rate-limit terlampaui
      res.status(429).json({
        status: 'error',
        message: 'Terlalu banyak percobaan login, silakan coba lagi setelah 15 menit.',
        retryAfter: 15 * 60, // Waktu tunggu dalam detik
      });
    }
  }
});
// Endpoint untuk logout
app.post('/sessionLogout', (req, res) => {
  res.clearCookie('session');
  res.json({ status: 'success' });
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


// denied access config
app.get('/403', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '403.html'));
});
// sign route
app.get('/sign', (req, res) => {
  res.redirect('/Auth/sign');
});
app.get('/Auth/sign', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/Auth', 'sign.html'));
});
// signup
app.get('/signup', (req, res) => {
  res.redirect('/Auth/signup');
});
app.get('/Auth/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/Auth', 'signup.html'));
});
// user
app.get('/Dashboard', (req, res) => {
  res.redirect('/User/Dashboard');
});
app.get('/User/Dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/User', 'Dashboard.html'));
});
// user history
app.get('/history', (req, res) => {
  res.redirect('/User/history');
});
app.get('/User/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/User', 'history.html'));
});
// Route middleware auth
app.get('/admin', authMiddleware, (req, res) => {
  res.redirect('/Dashboard/admin');
});

app.get('/Dashboard/admin', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/Dashboard', 'admin.html'));
});
app.get('/statistic', authMiddleware, (req, res) => {
  res.redirect('/Dashboard/statistic');
});

app.get('/Dashboard/statistic', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/Dashboard', 'statistic.html'));
});


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