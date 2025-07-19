const fs = require('fs');
const path = require('path');
const helpers = require('./utils/helpers');
const asahOtakGame = require('./games/asahOtak');
const suitGame = require('./games/suit');

// Game categories
const GAME_CATEGORIES = {
  ASAH_OTAK: 'ASAH_OTAK',
  SUIT: 'SUIT'
};

// Global variables
let bot;
let userData = {};
const activeGames = {};
const waitingPlayers = [];
const recentPlayers = {};

function initialize(botInstance) {
  bot = botInstance;
  loadData();
  setupHandlers();
}

function loadData() {
  try {
    userData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf8'));
  } catch (e) {
    userData = {};
  }
}

function saveUserData() {
  fs.writeFileSync(path.join(__dirname, '../data/data.json'), JSON.stringify(userData, null, 2));
}

function getUserData(userId, username) {
  if (!userData[userId]) {
    userData[userId] = {
      username: username || `User_${userId}`,
      coins: 0,
      score: 0,
      gamesPlayed: 0,
      wins: 0,
      lastActive: Date.now(),
      asahOtakWins: 0,
      suitWins: 0
    };
    saveUserData();
  } else if (username && userData[userId].username !== username) {
    userData[userId].username = username;
    saveUserData();
  }
  return userData[userId];
}

function setupHandlers() {
  // Start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    
    getUserData(userId, username);
    
    bot.sendMessage(chatId, '🎮 Silahkan Pilih Jenis Game:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Asah Otak 🧠', callback_data: 'game_ASAH_OTAK' }],
          [{ text: 'Suit ✊✌️✋', callback_data: 'game_SUIT' }],
          [{ text: 'Profil Saya 👤', callback_data: 'profile' }],
          [{ text: 'Peringkat 🏆', callback_data: 'ranking' }]
        ]
      }
    });
  });

  // Callback query handler
  bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;
    
    if (data === 'profile') {
      showProfile(userId, chatId);
      await bot.answerCallbackQuery(callbackQuery.id);
    } else if (data === 'ranking') {
      showRanking(userId, chatId);
      await bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('game_')) {
      const gameType = data.split('_')[1];
      handleGameSelection(userId, chatId, gameType);
      await bot.answerCallbackQuery(callbackQuery.id);
    } else if (data.startsWith('answer_')) {
      await asahOtakGame.handleAnswer(callbackQuery, bot, activeGames, getUserData, saveUserData, endGame);
    } else if (data.startsWith('hint_')) {
      await asahOtakGame.handleHint(callbackQuery, bot, activeGames, getUserData, saveUserData);
    } else if (data.startsWith('stop_')) {
      await handleStop(callbackQuery);
    } else if (data.startsWith('try_')) {
      await handleTryAgain(callbackQuery);
    } else if (data === 'find_new') {
      await handleFindNew(callbackQuery);
    } else if (data.startsWith('suit_')) {
      await suitGame.handleSuitChoice(callbackQuery, bot, activeGames, getUserData, saveUserData, endGame);
    }
  });

  // Other commands
  bot.onText(/\/profile/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    showProfile(userId, chatId);
  });

  bot.onText(/\/rank/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    showRanking(userId, chatId);
  });

  bot.onText(/\/try/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (activeGames[userId]) {
      bot.sendMessage(chatId, '⚠️ Anda sedang dalam permainan! Gunakan /stop jika ingin keluar.');
      return;
    }
    
    if (!recentPlayers[userId]) {
      bot.sendMessage(chatId, '❌ Tidak ada lawan terakhir yang tersedia. Gunakan /find untuk mencari lawan baru.');
      return;
    }
    
    const opponentId = recentPlayers[userId].id;
    const gameType = recentPlayers[userId].gameType;
    
    if (activeGames[opponentId] || waitingPlayers.some(p => p.userId === opponentId)) {
      delete recentPlayers[userId];
      bot.sendMessage(chatId, '⚠️ Lawan terakhir sedang sibuk. Gunakan /find untuk mencari lawan baru.');
      return;
    }
    
    if (gameType === GAME_CATEGORIES.ASAH_OTAK) {
      asahOtakGame.startGame(bot, opponentId, userId, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    } else {
      suitGame.startGame(bot, opponentId, userId, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    }
  });

  bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (activeGames[userId]) {
      endGame(userId, 'Permainan dihentikan oleh salah satu pemain.');
      bot.sendMessage(chatId, '🛑 Anda telah menghentikan permainan.');
    } else if (waitingPlayers.some(p => p.userId === userId)) {
      waitingPlayers.splice(waitingPlayers.findIndex(p => p.userId === userId), 1);
      bot.sendMessage(chatId, '🛑 Anda keluar dari antrian pencarian.');
    } else {
      bot.sendMessage(chatId, '⚠️ Anda tidak sedang dalam permainan atau antrian.');
    }
  });
}

function handleGameSelection(userId, chatId, gameType) {
  getUserData(userId).lastActive = Date.now();
  saveUserData();
  
  if (waitingPlayers.some(p => p.userId === userId)) {
    bot.sendMessage(chatId, '⏳ Anda sudah dalam antrian. Tunggu pemain lain...');
    return;
  }
  
  if (activeGames[userId]) {
    bot.sendMessage(chatId, '🎮 Anda sedang dalam permainan! Gunakan /stop jika ingin keluar.');
    return;
  }
  
  // Cari lawan dengan game type yang sama
  const opponentIndex = waitingPlayers.findIndex(p => p.gameType === gameType && p.userId !== userId);
  
  if (opponentIndex >= 0) {
    const opponent = waitingPlayers[opponentIndex];
    waitingPlayers.splice(opponentIndex, 1);
    
    if (gameType === GAME_CATEGORIES.ASAH_OTAK) {
      asahOtakGame.startGame(bot, opponent.userId, userId, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    } else {
      suitGame.startGame(bot, opponent.userId, userId, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    }
  } else {
    waitingPlayers.push({ userId, gameType });
    const gameName = gameType === GAME_CATEGORIES.ASAH_OTAK ? 'Asah Otak' : 'Suit';
    bot.sendMessage(chatId, `🔎 Mencari lawan untuk ${gameName}... Tunggu sebentar!`);
  }
}

function showProfile(userId, chatId) {
  const user = getUserData(userId);
  const minutesSinceActive = Math.floor((Date.now() - user.lastActive) / 60000);
  
  bot.sendMessage(chatId, 
    `👤 PROFIL ANDA:\n\n` +
    `🏷️ Nama: ${user.username}\n` +
    `💰 Koin: ${user.coins}\n` +
    `🏆 Skor Total: ${user.score}\n` +
    `🧠 Menang Asah Otak: ${user.asahOtakWins || 0}\n` +
    `✊ Menang Suit: ${user.suitWins || 0}\n` +
    `🎮 Total Game: ${user.gamesPlayed}\n` +
    `⏱️ Terakhir aktif: ${minutesSinceActive} menit lalu`);
}

function showRanking(userId, chatId) {
  const rankedUsers = helpers.getRankedUsers(userData);
  
  let rankMessage = '🏆 TOP 10 PEMAIN (Overall) 🏆\n\n';
  rankMessage += rankedUsers.slice(0, 10).map((user, index) => 
    `${index + 1}. ${user.username} - ${user.score} poin`
  ).join('\n');
  
  const userRank = helpers.getUserRank(userId, userData);
  if (userRank > 10) {
    const user = getUserData(userId);
    rankMessage += `\n\n...\n${userRank}. ${user.username} - ${user.score} poin`;
  }
  
  // Tambahkan ranking per kategori
  rankMessage += '\n\n🧠 TOP Asah Otak:\n';
  const asahOtakRanked = helpers.getRankedUsersByCategory(userData, GAME_CATEGORIES.ASAH_OTAK).slice(0, 3);
  rankMessage += asahOtakRanked.map((user, index) => 
    `${index + 1}. ${user.username} - ${user.asahOtakWins || 0} menang`
  ).join('\n');
  
  rankMessage += '\n\n✊ TOP Suit:\n';
  const suitRanked = helpers.getRankedUsersByCategory(userData, GAME_CATEGORIES.SUIT).slice(0, 3);
  rankMessage += suitRanked.map((user, index) => 
    `${index + 1}. ${user.username} - ${user.suitWins || 0} menang`
  ).join('\n');
  
  bot.sendMessage(chatId, rankMessage);
}

async function handleStop(callbackQuery) {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  const parts = data.split('_');
  const player1 = parts[1];
  const player2 = parts[2];
  
  if (activeGames[userId]) {
    endGame(userId, 'Permainan dihentikan oleh salah satu pemain.');
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Permainan dihentikan', show_alert: false });
  }
}

async function handleTryAgain(callbackQuery) {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  
  const parts = data.split('_');
  const player1 = parts[1];
  const player2 = parts[2];
  
  const recentPlayer = recentPlayers[userId];
  if (recentPlayer && (userId == player1 || userId == player2)) {
    if (recentPlayer.gameType === GAME_CATEGORIES.ASAH_OTAK) {
      asahOtakGame.startGame(bot, player1, player2, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    } else {
      suitGame.startGame(bot, player1, player2, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData);
    }
  }
  
  await bot.answerCallbackQuery(callbackQuery.id);
}

async function handleFindNew(callbackQuery) {
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  
  if (!activeGames[userId] && !waitingPlayers.some(p => p.userId === userId)) {
    // Kirim keyboard pilihan game
    bot.sendMessage(chatId, '🎮 Silahkan Pilih Jenis Game:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Asah Otak 🧠', callback_data: 'game_ASAH_OTAK' }],
          [{ text: 'Suit ✊✌️✋', callback_data: 'game_SUIT' }]
        ]
      }
    });
  }
  
  await bot.answerCallbackQuery(callbackQuery.id);
}

function endGame(userId, message) {
  if (!activeGames[userId]) return;
  
  const game = activeGames[userId];
  const opponentId = game.opponent;
  
  // Hentikan timer
  if (game.timer) clearTimeout(game.timer);
  if (activeGames[opponentId] && activeGames[opponentId].timer) {
    clearTimeout(activeGames[opponentId].timer);
  }
  
  // Kirim pesan
  if (game.gameType === GAME_CATEGORIES.ASAH_OTAK) {
    bot.sendMessage(userId, `${message}\nJawaban yang benar: ${game.answer}`);
    if (activeGames[opponentId]) {
      bot.sendMessage(opponentId, `${message}\nJawaban yang benar: ${game.answer}`);
    }
  } else {
    bot.sendMessage(userId, message);
    if (activeGames[opponentId]) {
      bot.sendMessage(opponentId, message);
    }
  }
  
  // Hapus game
  delete activeGames[userId];
  delete activeGames[opponentId];
}

module.exports = {
  initialize,
  GAME_CATEGORIES
};
