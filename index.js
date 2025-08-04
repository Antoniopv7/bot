require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const bienvenida = require('./bienvenida');
const tickets = require('./tickets');
const ranking = require('./ranking');
const servicio = require('./servicio');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.once('ready', async () => {
  console.log(`✅ BotRP conectado como ${client.user.tag}`);
  await tickets.iniciar(client);
  await ranking.iniciar(client);
  await servicio.iniciar(client);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply('🏓 Pong!');
  } else if (message.content === '!info') {
    message.channel.send('👮‍♂️ BotRP operativo en Pachavice RP.');
  }

  if (servicio.execute) {
    await servicio.execute(message, client);
  }
});

client.on('guildMemberAdd', async (member) => {
  await bienvenida(member);
});

client.on(Events.InteractionCreate, async (interaction) => {
  let handled = false;

  if (servicio.onInteraction) {
    handled = await servicio.onInteraction(interaction, client);
  }

  if (!handled && tickets.onInteraction) {
    handled = await tickets.onInteraction(interaction, client);
  }
});

client.login(process.env.DISCORD_TOKEN);
