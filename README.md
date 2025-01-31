# NYT_Leaderboard_Bot

## Setup

If you want to add this bot to your own channel, feel free.

Head to [the discord developer portal](https://discord.com/developers) and sign up. Create a new application with a name of your choosing.

Click on your application, and select the installation tab in the sidebar. For installation contexts, select Guild Install. Under the default install settings give it the scopes `applications.commands` and `bot`. Permissions relate directly to the permissions the bot has in your discord channel. Add `Manage Messages`, `Read Message History`, `Send Messages`, and `View Channels`. Click on the install link and you can add the bot to a discord server of your choosing as long as you have administrator privileges.

Under the bots tab and privileged gateway intents, toggle Message Content Intent to on.

Run the bot with `npm start`.

## Features
- Users can directly paste their connections result and have it parsed by the bot and assigned a score based on performance.
- User scores are saved for a month.
- Users can type `!leaderboard` to see the leaderboard for the month.
- At the end of the month, the winner is declared along with the number of points.
- Previous months leaderboards are archived.

## Possible upgrades

- Use a NoSql database to store data instead of `json` files.
- Add support for more than one discord server.
