if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config(); // Carga .env solo en desarrollo local
}

const { Client, GatewayIntentBits, Events } = require('discord.js');
const bienvenida = require('./bienvenida');
const { iniciarTickets } = require('./tickets');
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
  await iniciarTickets(client); // ✅ ahora sí funciona
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

// Manejo de interacciones extra (si las hay)
client.on(Events.InteractionCreate, async (interaction) => {
  let handled = false;

  if (servicio.onInteraction) {
    handled = await servicio.onInteraction(interaction, client);
  }

  // puedes agregar más handlers si los necesitas
});

// Verifica el token antes de iniciar sesión
const token = process.env.DISCORD_TOKEN;
if (!token || typeof token !== 'string') {
  console.error('Error: DISCORD_TOKEN no está definido o es inválido');
  process.exit(1);
}

// Inicia sesión
client.login(token).catch((error) => {
  console.error('Error al iniciar sesión:', error);
  process.exit(1);
});
