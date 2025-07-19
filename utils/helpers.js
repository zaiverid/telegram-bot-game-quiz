function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function getRankedUsers(userData) {
  return Object.entries(userData)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.score - a.score);
}

function getRankedUsersByCategory(userData, category) {
  return Object.entries(userData)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => {
      if (category === 'ASAH_OTAK') {
        return (b.asahOtakWins || 0) - (a.asahOtakWins || 0);
      } else if (category === 'SUIT') {
        return (b.suitWins || 0) - (a.suitWins || 0);
      }
      return b.score - a.score;
    });
}

function getUserRank(userId, userData) {
  const rankedUsers = getRankedUsers(userData);
  const index = rankedUsers.findIndex(user => user.id == userId);
  return index >= 0 ? index + 1 : rankedUsers.length + 1;
}

function determineSuitWinner(player1Choice, player2Choice) {
  if (player1Choice === player2Choice) return null;
  
  const rules = {
    '✊ Batu': ['✌️ Gunting'],
    '✌️ Gunting': ['✋ Kertas'],
    '✋ Kertas': ['✊ Batu']
  };
  
  return rules[player1Choice].includes(player2Choice) ? 'player1' : 'player2';
}

module.exports = {
  shuffleArray,
  getRankedUsers,
  getRankedUsersByCategory,
  getUserRank,
  determineSuitWinner
};
