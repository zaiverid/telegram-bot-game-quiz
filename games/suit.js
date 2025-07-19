const helpers = require('../utils/helpers');

const suitOptions = ['✊ Batu', '✌️ Gunting', '✋ Kertas'];

function startGame(bot, player1, player2, activeGames, waitingPlayers, recentPlayers, getUserData, saveUserData) {
  // Hapus dari antrian jika ada
  waitingPlayers.splice(waitingPlayers.findIndex(p => p.userId === player1), 1);
  waitingPlayers.splice(waitingPlayers.findIndex(p => p.userId === player2), 1);
  
  // Simpan sebagai lawan terakhir
  recentPlayers[player1] = { id: player2, gameType: 'SUIT' };
  recentPlayers[player2] = { id: player1, gameType: 'SUIT' };
  
  // Dapatkan nama pemain
  const player1Name = getUserData(player1).username;
  const player2Name = getUserData(player2).username;
  
  // Buat keyboard pilihan suit
  const options = suitOptions.map(option => {
    return [{ text: option, callback_data: `suit_${player1}_${player2}_${option}` }];
  });
  
  options.push([{ text: '🛑 Stop Game', callback_data: `stop_${player1}_${player2}` }]);
  
  // Simpan game
  activeGames[player1] = {
    opponent: player2,
    choice: null,
    timer: setTimeout(() => endGame(player1, '⏰ Waktu habis! Tidak ada yang memilih.', activeGames, bot),
    3000),
    gameType: 'SUIT',
    opponentName: player2Name
  };
  
  activeGames[player2] = {
    opponent: player1,
    choice: null,
    timer: setTimeout(() => endGame(player2, '⏰ Waktu habis! Tidak ada yang memilih.', activeGames, bot),
    3000),
    gameType: 'SUIT',
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
  
  // Kirim permainan
  const gameMessage = `🎮 GAME SUIT DIMULAI!\n\nLawan: ${player2Name}\n\nPilih dalam 3 detik!`;
  
  bot.sendMessage(player1, gameMessage, {
    reply_markup: { inline_keyboard: options }
  });
  
  bot.sendMessage(player2, `🎮 GAME SUIT DIMULAI!\n\nLawan: ${player1Name}\n\nPilih dalam 3 detik!`, {
    reply_markup: { inline_keyboard: options }
  });
}

async function handleSuitChoice(callbackQuery, bot, activeGames, getUserData, saveUserData, endGame) {
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  
  const parts = data.split('_');
  const player1 = parts[1];
  const player2 = parts[2];
  const choice = parts.slice(3).join('_');
  
  if (!activeGames[userId] || activeGames[userId].gameType !== 'SUIT') {
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Game sudah berakhir!', show_alert: true });
    return;
  }
  
  const game = activeGames[userId];
  game.choice = choice;
  
  await bot.answerCallbackQuery(callbackQuery.id, { text: `Anda memilih: ${choice}`, show_alert: false });
  
  // Cek apakah lawan sudah memilih
  const opponentGame = activeGames[game.opponent];
  if (opponentGame.choice) {
    // Kedua pemain sudah memilih, tentukan pemenang
    determineSuitWinnerAndEnd(game.opponent, userId, activeGames, bot, getUserData, saveUserData);
  }
}

function determineSuitWinnerAndEnd(player1, player2, activeGames, bot, getUserData, saveUserData) {
  const game1 = activeGames[player1];
  const game2 = activeGames[player2];
  
  // Hentikan timer
  clearTimeout(game1.timer);
  clearTimeout(game2.timer);
  
  const player1Choice = game1.choice;
  const player2Choice = game2.choice;
  const player1Name = getUserData(player1).username;
  const player2Name = getUserData(player2).username;
  
  let resultMessage = `✊ ${player1Name}: ${player1Choice}\n✌️ ${player2Name}: ${player2Choice}\n\n`;
  
  const winner = helpers.determineSuitWinner(player1Choice, player2Choice);
  
  // Update statistik
  const player1Data = getUserData(player1);
  const player2Data = getUserData(player2);
  
  if (winner === 'player1') {
    resultMessage += `🎉 ${player1Name} MENANG!`;
    player1Data.coins += 5;
    player1Data.score += 10;
    player1Data.wins = (player1Data.wins || 0) + 1;
    player1Data.suitWins = (player1Data.suitWins || 0) + 1;
  } else if (winner === 'player2') {
    resultMessage += `🎉 ${player2Name} MENANG!`;
    player2Data.coins += 5;
    player2Data.score += 10;
    player2Data.wins = (player2Data.wins || 0) + 1;
    player2Data.suitWins = (player2Data.suitWins || 0) + 1;
  } else {
    resultMessage += '✨ SERI!';
    player1Data.coins += 2;
    player2Data.coins += 2;
  }
  
  player1Data.lastActive = Date.now();
  player2Data.lastActive = Date.now();
  saveUserData();
  
  // Kirim hasil ke kedua pemain
  bot.sendMessage(player1, resultMessage);
  bot.sendMessage(player2, resultMessage);
  
  // Kirim tombol main lagi
  const tryAgainKeyboard = {
    inline_keyboard: [
      [{ text: '🔄 Main Lagi', callback_data: `try_${player1}_${player2}` }],
      [{ text: '🔍 Cari Lawan Baru', callback_data: 'find_new' }]
    ]
  };
  
  bot.sendMessage(player1, 'Permainan selesai!', { reply_markup: tryAgainKeyboard });
  bot.sendMessage(player2, 'Permainan selesai!', { reply_markup: tryAgainKeyboard });
  
  // Hapus game
  delete activeGames[player1];
  delete activeGames[player2];
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
  bot.sendMessage(userId, message);
  if (activeGames[opponentId]) {
    bot.sendMessage(opponentId, message);
  }
  
  // Hapus game
  delete activeGames[userId];
  delete activeGames[opponentId];
}

module.exports = {
  startGame,
  handleSuitChoice
};
