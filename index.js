const TelegramBot = require('node-telegram-bot-api');
const app = require('./app');

const token = 'Ganti_token_disni';
const bot = new TelegramBot(token, {polling: true});

// Initialize app
app.initialize(bot);

console.log('🤖 Bot sedang berjalan...');
