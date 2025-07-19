# Telegram Bot Game Quiz - Panduan Instalasi

![Tangkap Layar](path/1.jpg)

Bot Telegram multiplayer dengan fitur game Asah Otak dan Suit (Batu-Gunting-Kertas)

## Fitur Utama
- 🧠 Game Asah Otak dengan waktu 30 detik
- ✊ Game Suit dengan waktu 3 detik
- 🏆 Leaderboard per kategori game
- 💰 Sistem koin dan reward
- 👥 Multiplayer dengan nama lawan

## Persyaratan
- Node.js v14 atau lebih baru
- Git (untuk instalasi dari GitHub)
- Akun Telegram dan token bot dari @BotFather

## Instalasi di Termux (Android)

1. Buka Termux dan jalankan perintah berikut:
```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone https://github.com/zaiverid/telegram-bot-game-quiz.git
cd telegram-bot-game-quiz
npm install
```

2. Edit file config:
```bash
nano index.js
```
Ganti `'Ganti_token_disni'` dengan token bot Anda

3. Jalankan bot:
```bash
node index.js
```

## Instalasi di Linux

1. Install Node.js dan Git:
```bash
sudo apt update
sudo apt install nodejs git
```

2. Clone repository dan install dependencies:
```bash
git clone https://github.com/zaiverid/telegram-bot-game-quiz.git
cd telegram-bot-game-quiz
npm install
```

3. Edit file config:
```bash
nano index.js
```
Ganti `'Ganti_token_disni'` dengan token bot Anda

4. Jalankan bot:
```bash
node index.js
```

## Instalasi di Windows

1. Download dan install:
   - [Node.js](https://nodejs.org/)
   - [Git](https://git-scm.com/)

2. Buka Command Prompt atau PowerShell, lalu jalankan:
```cmd
git clone https://github.com/zaiverid/telegram-bot-game-quiz.git
cd telegram-bot-game-quiz
npm install
```

3. Edit file `index.js` dengan text editor:
   - Buka file `index.js`
   - Ganti `'Ganti_token_disni'` dengan token bot Anda
   - Simpan perubahan

4. Jalankan bot:
```cmd
node index.js
```

## Cara Mendapatkan Token Bot

1. Buka Telegram dan cari @BotFather
2. Ketik `/newbot` dan ikuti instruksi
3. Salin token yang diberikan (contoh: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. Ganti token di file `index.js`

## Perintah yang Tersedia
- `/start` - Mulai bot dan pilih game
- `/profile` - Lihat profil Anda
- `/rank` - Lihat peringkat pemain
- `/try` - Main lagi dengan lawan terakhir
- `/stop` - Hentikan permainan saat ini

## Struktur File
```
telegram-bot-game-quiz/
├── data/
│   ├── data.json (menyimpan data pengguna)
│   └── words.json (pertanyaan asah otak)
├── games/
│   ├── asahOtak.js (logika game asah otak)
│   └── suit.js (logika game suit)
├── utils/
│   └── helpers.js (fungsi utilitas)
├── app.js (logika utama bot)
├── index.js (entry point)
└── package.json
```

## Cara Menambahkan Pertanyaan
Edit file `data/words.json` dengan format:
```json
[
  {
    "question": "Pertanyaan contoh?",
    "options": ["Pilihan 1", "Pilihan 2", "Pilihan 3", "Pilihan 4"],
    "answer": "Pilihan 1"
  }
]
```

## Troubleshooting
- Jika ada error `MODULE_NOT_FOUND`, jalankan `npm install` lagi
- Pastikan token bot sudah benar
- Untuk masalah koneksi, periksa jaringan internet Anda

## Kontribusi
Pull request dipersilakan. Untuk perubahan besar, buka issue terlebih dahulu.

## Lisensi
[MIT](https://choosealicense.com/licenses/mit/)
