# NYT_Leaderboard_Bot

A Discord bot that tracks scores from the New York Times Connections game and maintains monthly leaderboards across multiple servers.

## Features

- Users can directly paste their connections result and have it parsed by the bot and assigned a score based on performance.
- User scores are saved for a month.
- Users can type `!leaderboard` or use the `/leaderboard` slash command to see the leaderboard for the month.
- Server admins can set announcement channels with `/setannouncementchannel`.
- At the end of the month, the winner is declared along with the number of points.
- Previous months' leaderboards are stored in MongoDB.
- Support for multiple Discord servers.

## Setup

### Prerequisites

- Node.js 18+ installed
- MongoDB database (Atlas or self-hosted)
- Discord Developer account

### Discord Bot Setup

1. Head to [the Discord Developer Portal](https://discord.com/developers) and sign up.
2. Create a new application with a name of your choosing.
3. Click on your application, and select the "Bot" tab in the sidebar.
4. Click "Add Bot" and confirm.
5. Under the "Privileged Gateway Intents" section, toggle the "Message Content Intent" to ON.
6. Copy your bot token (you'll need this later).

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/NYT_Leaderboard_Bot.git
   cd NYT_Leaderboard_Bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file by copying the sample:
   ```
   cp .env.sample .env
   ```

4. Edit the `.env` file with your Discord token and MongoDB URI:
   ```
   NODE_ENV="development"
   DISCORD_TOKEN=your_discord_bot_token
   MONGODB_URI=your_mongodb_connection_string
   ```

### MongoDB Setup

1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available) or install MongoDB locally.
2. Create a new cluster (if using Atlas).
3. Create a database user with read/write permissions.
4. Get your connection string and add it to the `.env` file.

### Inviting the Bot to Your Server

1. Go to the Discord Developer Portal and select your application.
2. Go to the "OAuth2" tab and then "URL Generator".
3. Select the following scopes:
   - `bot`
   - `applications.commands`
4. Select the following bot permissions:
   - "Send Messages"
   - "View Channels"
   - "Read Message History"
   - "Manage Messages"
5. Copy the generated URL and open it in your browser.
6. Select the server you want to add the bot to and authorize it.

### Running the Bot

Start the bot with:
```
npm start
```

For production deployment, consider using a process manager like PM2:
```
npm install -g pm2
pm2 start bot.js
```

## Usage

### Commands

- **Connections Score Tracking**: Simply paste your Connections game result in the chat for the bot to track it.

  Example:
  ```
  Connections
  Puzzle #123
  🟨🟨🟨🟨
  🟩🟩🟩🟩
  🟦🟦🟦🟦
  🟪🟪🟪🟪
  ```

- **!leaderboard**: Shows the current month's leaderboard (legacy text command).

- **/leaderboard**: Shows the current month's leaderboard (slash command).

- **/setannouncementchannel**: (Admin only) Sets the channel where monthly winners will be announced.

## Modifying the Bot

The bot is structured as follows:

- `bot.js`: Main bot logic
- `models/`: Database schemas
- `services/`: Business logic for leaderboards

To add new features, consider:
1. Adding new schemas in the `models/` directory
2. Adding new service methods in `services/`
3. Adding new command handlers in `bot.js`

## License

ISC
