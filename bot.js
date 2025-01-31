require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

 function debugLog(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

class Leaderboard {
  constructor(filename) {
    this.filename = filename;
    this.leaderboard = this.loadLeaderboard();
  }

  loadLeaderboard() {
    try {
      const data = fs.readFileSync(this.filename, 'utf8');
      return JSON.parse(data).leaderboard || {};
    } catch (err) {
      return {};
    }
  }

  addScore(user, score) {
    if (!this.leaderboard[user]) {
      this.leaderboard[user] = { score: 0, lastSubmission: null };
    }

    const today = new Date().toISOString().split('T')[0];
    if (this.leaderboard[user].lastSubmission === today) {
      throw new Error('You have already submitted a score today.');
    }

    this.leaderboard[user].score += score;
    this.leaderboard[user].lastSubmission = today;
    this.flush();

    return this.leaderboard[user].score;
  }

  flush() {
    const data = JSON.stringify({ leaderboard: this.leaderboard }, null, 2);
    fs.writeFileSync(this.filename, data, 'utf8');
  }

  showLeaderboard() {
    if (Object.keys(this.leaderboard).length === 0) {
      return 'Leaderboard is empty.';
    }

    const sortedEntries = Object.entries(this.leaderboard).sort(
      (a, b) => b[1].score - a[1].score
    );
    let leaderboardText = '';
    let rank = 1;

    for (let i = 0; i < sortedEntries.length; i++) {
      if (i > 0 && sortedEntries[i][1].score < sortedEntries[i - 1][1].score) {
        rank = i + 1;
      }
      leaderboardText += `${rank}. <@${sortedEntries[i][0]}>: ${sortedEntries[i][1].score}\n`;
    }

    return leaderboardText;
  }

  getWinner() {
    if (Object.keys(this.leaderboard).length === 0) {
      return null;
    }

    const sortedEntries = Object.entries(this.leaderboard).sort(
      (a, b) => b[1].score - a[1].score
    );
    return sortedEntries[0];
  }

  reset() {
    this.leaderboard = {};
    this.flush();
  }
}

const currentMonthLeaderboard = new Leaderboard('current_leaderboard.json');
const archiveDir = path.join(__dirname, 'leaderboard_archive');

if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir);
}

function archiveLeaderboard() {
  const now = new Date();
  const lastMonth = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;

  const archiveFilename = path.join(
    archiveDir,
    `${lastMonth}_leaderboard.json`
  );
  const data = JSON.stringify(
    { leaderboard: currentMonthLeaderboard.leaderboard },
    null,
    2
  );
  fs.writeFileSync(archiveFilename, data, 'utf8');

  debugLog(`Leaderboard archived for ${lastMonth}`);
}

function announceWinnerAndReset(client) {
  const winner = currentMonthLeaderboard.getWinner();
  if (winner) {
    const [userID, userData] = winner;
    const announcement = `🎉 Congratulations <@${userID}> for winning this month's Connections leaderboard with ${userData.score} points! 🎉`;
    const channel = client.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      channel.send(announcement);
    }
  }

  archiveLeaderboard();

  currentMonthLeaderboard.reset();
  debugLog('Leaderboard reset for the new month.');
}

function scheduleMonthlyReset(client) {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const timeUntilNextMonth = nextMonth - now;

  setTimeout(() => {
    announceWinnerAndReset(client);
    scheduleMonthlyReset(client);
  }, timeUntilNextMonth);
}

function parseConnectionsMessage(message) {
  debugLog('Parsing message:', message);
  const lines = message.split('\n').slice(2); // Skip the first two lines
  debugLog('Lines:', lines);

  const grid = lines.map((line) => {
    const emojis = Array.from(line).filter((char) => char.trim() !== '');
    debugLog('Emojis in line:', emojis);
    return emojis.map((emoji) => {
      switch (emoji) {
        case '🟨':
          return 0;
        case '🟩':
          return 1;
        case '🟦':
          return 2;
        case '🟪':
          return 3;
        default:
          throw new Error(`Invalid emoji: ${emoji}`);
      }
    });
  });

  if (grid.length < 4 || grid.some((row) => row.length !== 4)) {
    throw new Error('Invalid grid format');
  }

  return grid;
}

function calculateConnectionsScore(grid) {
  let success = 0;
  for (const row of grid) {
    const first = row[0];
    if (row.every((cell) => cell === first)) {
      success++;
    }
  }

  if (success === 4) {
    return 8 - grid.length + success;
  } else {
    return success;
  }
}


client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content.startsWith('Connections')) {
    try {
      const grid = parseConnectionsMessage(content);
      const score = calculateConnectionsScore(grid);
      const totalScore = currentMonthLeaderboard.addScore(
        message.author.id,
        score
      );

      const reply = `You earned ${score} points today!\nTotal score: ${totalScore}`;
      await message.reply(reply);
    } catch (err) {
      await message.reply(`Error: ${err.message}`);
    }
  }

  if (content === '!leaderboard') {
    const leaderboardText = currentMonthLeaderboard.showLeaderboard();
    await message.reply(
      `**Connections Leaderboard (This Month):**\n${leaderboardText}`
    );
  }
});

client.login(process.env.DISCORD_TOKEN).then(() => {
  scheduleMonthlyReset(client);
});
