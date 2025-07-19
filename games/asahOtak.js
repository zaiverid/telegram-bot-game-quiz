const fs = require('fs');
const path = require('path');
const helpers = require('../utils/helpers');

const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/words.json'), 'utf8'));

function startGame(bot, player1, player2, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData) {
  // Hapus dari antrian jika ada
  waitingPlayers.splice(waitingPlayers.findIndex(p => p.userId === player1), 1);
  waitingPlayers.splice(waitingPlayers.findIndex(p => p.userId === player2), 1);
  
  // Simpan sebagai lawan terakhir
  recentPlayers[player1] = { id: player2, gameType: 'ASAH_OTAK' };
  recentPlayers[player2] = { id: player1, gameType: 'ASAH_OTAK' };
  
  // Pilih pertanyaan acak
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  
  // Acak posisi jawaban
  const shuffledOptions = helpers.shuffleArray(randomQuestion.options);
  
  // Dapatkan nama pemain
  const player1Name = getUserData(player1).username;
  const player2Name = getUserData(player2).username;
  
  // Buat keyboard dengan posisi jawaban acak
  const options = shuffledOptions.map(option => {
    return [{ text: option, callback_data: `answer_${player1}_${player2}_${option}` }];
  });
  
  // Tambahkan tombol hint dan stop
  options.push(
    [{ text: '💡 Hint (10 koin)', callback_data: `hint_${player1}_${player2}` }],
    [{ text: '🛑 Stop Game', callback_data: `stop_${player1}_${player2}` }]
  );
  
  // Simpan game
  activeGames[player1] = {
    opponent: player2,
    question: randomQuestion.question,
    answer: randomQuestion.answer,
    options: randomQuestion.options,
    shuffledOptions: shuffledOptions,
    timer: setTimeout(() => endGame(player1, '⏰ Waktu habis! Tidak ada yang menjawab.', activeGames, bot),
    30000),
    hintUsed: false,
    gameType: 'ASAH_OTAK',
    opponentName: player2Name
  };
  
  activeGames[player2] = {
    opponent: player1,
    question: randomQuestion.question,
    answer: randomQuestion.answer,
    options: randomQuestion.options,
    shuffledOptions: shuffledOptions,
    timer: setTimeout(() => endGame(player2, '⏰ Waktu habis! Tidak ada yang menjawab.', activeGames, bot),
    30000),
    hintUsed: false,
    gameType: 'ASAH_OTAK',
    opponentName: player1Name
  };
  
  // Update statistik
  const now = Date.now();
  const player1Data = getUserData(player1);
  const player2Data = getUserData(player2);
  
  player1Data.gamesPlayed += 1;
  player1Data.lastActive = now;
  player2Data.gamesPlayed += 1;
  player2Data.lastActive = now;
  saveUserData();
  
  // Kirim pertanyaan
  const gameMessage = `🎮 GAME ASAH OTAK DIMULAI!\n\nLawan: ${player2Name}\n\nPertanyaan:\n${randomQuestion.question}\n\nAnda memiliki 30 detik untuk menjawab!`;
  
  bot.sendMessage(player1, gameMessage, {
    reply_markup: { inline_keyboard: options }
  });
  
  bot.sendMessage(player2, `🎮 GAME ASAH OTAK DIMULAI!\n\nLawan: ${player1Name}\n\nPertanyaan:\n${randomQuestion.question}\n\nAnda memiliki 30 detik untuk menjawab!`, {
    reply_markup: { inline_keyboard: options }
  });
}

async function handleAnswer(callbackQuery, bot, activeGames, getUserData, saveUserData, endGame) {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  
  const parts = data.split('_');
  const player1 = parts[1];
  const player2 = parts[2];
  const answer = parts.slice(3).join('_');
  
  if (!activeGames[userId] || activeGames[userId].gameType !== 'ASAH_OTAK') {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Game sudah berakhir!', show_alert: true });
    return;
  }
  
  const game = activeGames[userId];
  const isCorrect = answer === game.answer;
  
  // Hentikan timer
  clearTimeout(game.timer);
  clearTimeout(activeGames[game.opponent].timer);
  
  // Update statistik
  const user = getUserData(userId);
  if (isCorrect) {
    user.coins += 2;
    user.score += 20;
    user.wins = (user.wins || 0) + 1;
    user.asahOtakWins = (user.asahOtakWins || 0) + 1;
    user.lastActive = Date.now();
    saveUserData();
  }
  
  // Kirim hasil
  const answerMessage = `Jawaban yang benar: ${game.answer}`;
  
  if (isCorrect) {
    bot.sendMessage(userId, `✅ ANDA BENAR!\n${answerMessage}\n\n+2 koin dan +20 skor!`);
    bot.sendMessage(game.opponent, `❌ LAWAN ANDA (${game.opponentName}) BENAR!\n${answerMessage}`);
  } else {
    bot.sendMessage(userId, `❌ ANDA SALAH!\n${answerMessage}`);
    bot.sendMessage(game.opponent, `✅ LAWAN ANDA (${game.opponentName}) SALAH!\n${answerMessage}`);
  }
  
  // Hapus game
  delete activeGames[userId];
  delete activeGames[game.opponent];
  
  // Kirim tombol main lagi
  const tryAgainKeyboard = {
    inline_keyboard: [
      [{ text: '🔄 Main Lagi', callback_data: `try_${player1}_${player2}` }],
      [{ text: '🔍 Cari Lawan Baru', callback_data: 'find_new' }]
    ]
  };
  
  bot.sendMessage(userId, 'Permainan selesai!', { reply_markup: tryAgainKeyboard });
  bot.sendMessage(game.opponent, 'Permainan selesai!', { reply_markup: tryAgainKeyboard });
  
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: isCorrect ? 'Jawaban benar! +2 koin, +20 skor' : 'Jawaban salah!', 
    show_alert: true 
  });
}

async function handleHint(callbackQuery, bot, activeGames, getUserData, saveUserData) {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  
  const parts = data.split('_');
  const player1 = parts[1];
  const player2 = parts[2];
  
  if (!activeGames[userId] || activeGames[userId].gameType !== 'ASAH_OTAK') {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Game sudah berakhir!', show_alert: true });
    return;
  }
  
  const game = activeGames[userId];
  const user = getUserData(userId);
  
  if (game.hintUsed) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Anda sudah menggunakan hint!', show_alert: true });
    return;
  }
  
  if (user.coins < 10) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Koin Anda tidak cukup! Butuh 10 koin.', show_alert: true });
    return;
  }
  
  // Kurangi koin dan aktifkan hint
  user.coins -= 10;
  game.hintUsed = true;
  user.lastActive = Date.now();
  saveUserData();
  
  // Hapus 2 jawaban salah dari opsi asli
  const wrongOptions = game.options.filter(opt => opt !== game.answer);
  const optionsToRemove = wrongOptions.slice(0, 2);
  
  // Filter opsi yang diacak untuk ditampilkan
  const remainingOptions = game.shuffledOptions.filter(opt => 
    !optionsToRemove.includes(opt) || opt === game.answer
  );
  
  // Buat keyboard baru
  const newOptions = remainingOptions.map(option => {
    return [{ text: option, callback_data: `answer_${player1}_${player2}_${option}` }];
  });
  
  newOptions.push(
    [{ text: '💡 Hint sudah digunakan', callback_data: 'hint_used' }],
    [{ text: '🛑 Stop Game', callback_data: `stop_${player1}_${player2}` }]
  );
  
  // Edit pesan
  await bot.editMessageText(
    `Pertanyaan: ${game.question}\n\n💡 Anda menggunakan hint! 2 opsi salah dihapus.`,
    {
      chat_id: chatId,
      message_id: callbackQuery.message.message_id,
      reply_markup: { inline_keyboard: newOptions }
    }
  );
  
  await bot.answerCallbackQuery(callbackQuery.id, { 
    text: 'Hint digunakan! 2 opsi salah dihapus.', 
    show_alert: true 
  });
}

function endGame(userId, message, activeGames, bot) {
  if (!activeGames[userId]) return;
  
  const game = activeGames[userId];
  const opponentId = game.opponent;
  
  // Hentikan timer
  if (game.timer) clearTimeout(game.timer);
  if (activeGames[opponentId] && activeGames[opponentId].timer) {
    clearTimeout(activeGames[opponentId].timer);
  }
  
  // Kirim pesan
  bot.sendMessage(userId, `${message}\nJawaban yang benar: ${game.answer}`);
  if (activeGames[opponentId]) {
    bot.sendMessage(opponentId, `${message}\nJawaban yang benar: ${game.answer}`);
  }
  
  // Hapus game
  delete activeGames[userId];
  delete activeGames[opponentId];
}

module.exports = {
  startGame,
  handleAnswer,
  handleHint
};
