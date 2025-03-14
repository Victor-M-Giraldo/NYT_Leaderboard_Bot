require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
} = require('discord.js');
const { connectDB } = require('./models/database');
const leaderboardService = require('./services/leaderboardService');

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

// Schedule monthly reset for all servers
async function scheduleMonthlyReset() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const timeUntilNextMonth = nextMonth - now;

  setTimeout(async () => {
    await performMonthlyReset();
    scheduleMonthlyReset(); // Schedule the next reset
  }, timeUntilNextMonth);

  debugLog(
    `Monthly reset scheduled. Next reset in ${Math.floor(
      timeUntilNextMonth / (1000 * 60 * 60 * 24)
    )} days`
  );
}

// Perform monthly reset and winner announcements for all servers
async function performMonthlyReset() {
  try {
    const serverIds = await leaderboardService.getAllServerIds();
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    for (const serverId of serverIds) {
      try {
        // Get winner from the previous month
        const winner = await leaderboardService.getWinner(
          serverId,
          lastMonth,
          lastMonthYear
        );

        if (winner) {
          const announcementChannelId =
            await leaderboardService.getAnnouncementChannel(serverId);

          if (announcementChannelId) {
            const channel = client.channels.cache.get(announcementChannelId);

            if (channel && channel.isTextBased()) {
              const announcement = `🎉 Congratulations <@${winner.userId}> for winning this month's Connections leaderboard with ${winner.score} points! 🎉`;
              await channel.send(announcement);
              debugLog(`Winner announced in server ${serverId}`);
            }
          }
        }

        // Archive the leaderboard (no action needed with our MongoDB implementation)
        await leaderboardService.archiveLeaderboard(
          serverId,
          lastMonth,
          lastMonthYear
        );
      } catch (error) {
        console.error(
          `Error processing monthly reset for server ${serverId}:`,
          error
        );
      }
    }

    debugLog('Monthly reset completed for all servers');
  } catch (error) {
    console.error('Error in performMonthlyReset:', error);
  }
}

// Register slash commands for each guild the bot joins
async function registerCommands(guild) {
  try {
    const commands = [
      {
        name: 'setannouncementchannel',
        description: 'Set the channel for leaderboard announcements',
        options: [
          {
            name: 'channel',
            description: 'The channel to announce winners in',
            type: 7, // CHANNEL type
            required: true,
          },
        ],
      },
      {
        name: 'leaderboard',
        description: "Show the current month's leaderboard",
      },
    ];

    await guild.commands.set(commands);
    debugLog(`Registered commands for guild ${guild.name}`);
  } catch (error) {
    console.error(`Error registering commands for guild ${guild.id}:`, error);
  }
}

// Event handlers
client.on(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Register the bot with each guild it's in
  for (const guild of client.guilds.cache.values()) {
    await leaderboardService.registerServer(guild.id);
    await registerCommands(guild);
  }

  // Schedule the monthly reset
  scheduleMonthlyReset();
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await leaderboardService.registerServer(guild.id);
    await registerCommands(guild);
    debugLog(`Joined new guild: ${guild.name}`);
  } catch (error) {
    console.error(`Error setting up new guild ${guild.id}:`, error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options, guildId } = interaction;

  if (commandName === 'setannouncementchannel') {
    // Check if user has admin privileges
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: 'You need administrator permissions to use this command.',
        ephemeral: true,
      });
      return;
    }

    const channel = options.getChannel('channel');

    if (!channel.isTextBased()) {
      await interaction.reply({
        content: 'Please select a text channel.',
        ephemeral: true,
      });
      return;
    }

    try {
      await leaderboardService.setAnnouncementChannel(guildId, channel.id);
      await interaction.reply({
        content: `Announcement channel set to ${channel.name}!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error setting announcement channel:', error);
      await interaction.reply({
        content: 'An error occurred. Please try again.',
        ephemeral: true,
      });
    }
  }

  if (commandName === 'leaderboard') {
    try {
      const entries = await leaderboardService.getLeaderboard(guildId);

      if (entries.length === 0) {
        await interaction.reply('No scores recorded this month yet!');
        return;
      }

      let leaderboardText = '**Connections Leaderboard (This Month):**\n';
      let currentRank = 1;
      let currentScore = entries[0].score;

      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].score < currentScore) {
          currentRank = i + 1;
          currentScore = entries[i].score;
        }

        leaderboardText += `${currentRank}. <@${entries[i].userId}>: ${entries[i].score}\n`;
      }

      await interaction.reply(leaderboardText);
    } catch (error) {
      console.error('Error showing leaderboard:', error);
      await interaction.reply({
        content: 'An error occurred. Please try again.',
        ephemeral: true,
      });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const serverId = message.guildId;

  if (content.startsWith('Connections')) {
    try {
      const grid = parseConnectionsMessage(content);
      const score = calculateConnectionsScore(grid);

      const entry = await leaderboardService.addScore(
        serverId,
        message.author.id,
        score
      );

      const reply = `You earned ${score} points today!\nTotal score: ${entry.score}`;
      await message.reply(reply);
    } catch (err) {
      await message.reply(`Error: ${err.message}`);
    }
  }

  if (content === '!leaderboard') {
    try {
      const entries = await leaderboardService.getLeaderboard(serverId);

      if (entries.length === 0) {
        await message.reply('No scores recorded this month yet!');
        return;
      }

      let leaderboardText = '**Connections Leaderboard (This Month):**\n';
      let currentRank = 1;
      let currentScore = entries[0].score;

      for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].score < currentScore) {
          currentRank = i + 1;
          currentScore = entries[i].score;
        }

        leaderboardText += `${currentRank}. <@${entries[i].userId}>: ${entries[i].score}\n`;
      }

      await message.reply(leaderboardText);
    } catch (error) {
      console.error('Error showing leaderboard:', error);
      await message.reply('An error occurred. Please try again.');
    }
  }
});

// Connect to MongoDB and then connect to Discord
async function start() {
  try {
    await connectDB();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
}

start();
