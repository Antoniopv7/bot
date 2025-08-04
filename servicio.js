const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  Events
} = require('discord.js');

const servicioActivo = new Map(); // Usuarios en servicio
const tiemposAcumulados = new Map(); // Tiempo total trabajado
const canalServicioId = '1398071067121025134'; // Canal donde va la tabla de servicio

const ranking = require('./ranking');

async function iniciar(client) {
  const canal = await client.channels.fetch(canalServicioId);
  if (!canal || canal.type !== ChannelType.GuildText) return;

  const opcionesServicio = [
    { label: 'Comisaría', value: 'comisaria' },
    { label: 'Central', value: 'central' },
    { label: 'Supervisando', value: 'supervisando' },
    { label: 'Entrenamiento', value: 'entrenamiento' },
    { label: 'Capacitando', value: 'capacitando' },
    { label: 'Patrullaje', value: 'patrullaje' }
  ];

  const menuDesplegable = new StringSelectMenuBuilder()
    .setCustomId('seleccionar_servicio')
    .setPlaceholder('📋 Selecciona el tipo de servicio')
    .addOptions(opcionesServicio);

  const botonEntrar = new ButtonBuilder()
    .setCustomId('confirmar_entrar')
    .setLabel('✅ Entrar en servicio')
    .setStyle(ButtonStyle.Success);

  const botonSalir = new ButtonBuilder()
    .setCustomId('salir_servicio')
    .setLabel('❌ Salir de servicio')
    .setStyle(ButtonStyle.Danger);

  const rowMenu = new ActionRowBuilder().addComponents(menuDesplegable);
  const rowBotones = new ActionRowBuilder().addComponents(botonEntrar, botonSalir);

  // Enviar o actualizar mensaje de control servicio
  let mensajeControl;
  const mensajes = await canal.messages.fetch({ limit: 10 });
  mensajeControl = mensajes.find(m => m.author.id === client.user.id);
  if (!mensajeControl) {
    mensajeControl = await canal.send({
      content: '**🕒 Control de horas de servicio**\nSelecciona el servicio e ingresa cuando estés listo.',
      components: [rowMenu, rowBotones],
      embeds: [crearEmbedTabla()]
    });
  } else {
    await mensajeControl.edit({ embeds: [crearEmbedTabla()], components: [rowMenu, rowBotones] });
  }

  // Evitar múltiples listeners: remover antes de agregar
  client.removeAllListeners(Events.InteractionCreate);
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const userId = interaction.user.id;

    if (interaction.customId === 'seleccionar_servicio') {
      const servicio = interaction.values[0];
      servicioActivo.set(userId, { tipo: servicio, inicio: null });
      await interaction.reply({
        content: `📋 Has seleccionado el servicio: **${servicio}**`,
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === 'confirmar_entrar') {
      const datos = servicioActivo.get(userId);
      if (!datos || !datos.tipo) {
        return interaction.reply({ content: '⚠️ Primero debes seleccionar un tipo de servicio.', ephemeral: true });
      }
      if (datos.inicio) {
        return interaction.reply({ content: '⚠️ Ya estás en servicio.', ephemeral: true });
      }

      datos.inicio = Date.now();
      servicioActivo.set(userId, datos);

      await interaction.reply({ content: `✅ Has iniciado servicio: **${datos.tipo}**`, ephemeral: true });
      await actualizarEmbedTabla(mensajeControl, client);
      return;
    }

    if (interaction.customId === 'salir_servicio') {
      const datos = servicioActivo.get(userId);
      if (!datos || !datos.inicio) {
        return interaction.reply({ content: '⚠️ No estás en servicio actualmente.', ephemeral: true });
      }

      const tiempo = Math.floor((Date.now() - datos.inicio) / 1000);
      servicioActivo.delete(userId);

      const total = (tiemposAcumulados.get(userId) || 0) + tiempo;
      tiemposAcumulados.set(userId, total);

      await interaction.reply({ content: `❌ Has salido de servicio. Tiempo trabajado: **${formatTiempo(tiempo)}**`, ephemeral: true });
      await actualizarEmbedTabla(mensajeControl, client);
      await ranking.actualizarRanking(client, tiemposAcumulados);
      return;
    }
  });
}

function crearEmbedTabla() {
  const embed = new EmbedBuilder()
    .setTitle('👮 Oficiales en Servicio')
    .setColor('#00aaff')
    .setTimestamp();

  const categoriasOrdenadas = ['comisaria', 'central', 'supervisando', 'entrenamiento', 'capacitando', 'patrullaje'];
  let contenido = '';

  for (const cat of categoriasOrdenadas) {
    const enCategoria = [...servicioActivo.entries()].filter(([_, d]) => d.tipo === cat && d.inicio);
    if (enCategoria.length > 0) {
      contenido += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}**\n`;
      for (const [uid] of enCategoria) {
        contenido += `> <@${uid}>\n`;
      }
      contenido += '\n';
    }
  }

  if (!contenido) contenido = '_Nadie está en servicio actualmente._';
  embed.setDescription(contenido);
  return embed;
}

async function actualizarEmbedTabla(mensaje, client) {
  const nuevoEmbed = crearEmbedTabla();
  await mensaje.edit({ embeds: [nuevoEmbed] });
}

function formatTiempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  return `${horas}h ${minutos}m ${segs}s`;
}

module.exports = { iniciar };
