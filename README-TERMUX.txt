ALWI GAME REVIEW — MVP UNTUK TERMUX
1. Ekstrak ZIP ke Download.
2. Di Termux jalankan:
   termux-setup-storage
   pkg install python -y
   cd ~/storage/shared/Download/ALWI-GAME-REVIEW
   python -m http.server 8080
3. Buka Chrome: http://127.0.0.1:8080

Fitur awal:
- Database akun lokal Free Fire dan Mobile Legends.
- Cari UID/ID dan server dari data yang sudah disimpan.
- Catat level, rank, match, win rate, jumlah skin, total top up.
- Tambah catatan skin/hero, riwayat match, dan transaksi top up.
- Ekspor backup JSON.

PENTING:
Ini MVP web-app/PWA, belum APK native. Untuk APK perlu wrapper Android WebView/Capacitor dan Android SDK/Gradle.
Pencarian UID belum terhubung ke server game. API resmi/penyedia data sah perlu dikonfigurasi terlebih dahulu.
Skin, statistik privat, riwayat match dan transaksi harus berasal dari input pemilik akun atau sumber resmi.
Tidak meminta password, OTP, token, atau cookie game.
