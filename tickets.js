const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Events
} = require('discord.js');

module.exports = async (client) => {
  const canalPostulacionesId = '1402040366282047609';
  const categoriaTicketsId = '1401657156935356558';
  const canalAuditoriaId = '1402039588108636242';
  const staffRoleIds = ['1402042683366572032', '1402043308834033705'];

  const canalPostulaciones = await client.channels.fetch(canalPostulacionesId);

  // Limpiar mensajes anteriores del bot y enviar mensaje con botón
  if (canalPostulaciones) {
    const mensajes = await canalPostulaciones.messages.fetch({ limit: 10 });
    const mensajesBot = mensajes.filter(msg => msg.author.id === client.user.id);
    for (const mensaje of mensajesBot.values()) {
      await mensaje.delete().catch(() => {});
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('crear_ticket')
        .setLabel('🎫 Crear Ticket de Postulación')
        .setStyle(ButtonStyle.Success)
    );

    const mensaje = `📩 **¿Quieres postular a la LSPD?**\n\nPresiona el botón de abajo para abrir un ticket. Serás atendido por el equipo correspondiente.`;

    canalPostulaciones.send({ content: mensaje, components: [row] }).catch(console.error);
  }

  // Función auxiliar para enviar auditoría
  async function registrarAuditoria(guild, texto) {
    const canalAuditoria = guild.channels.cache.get(canalAuditoriaId);
    if (canalAuditoria) {
      await canalAuditoria.send(texto).catch(console.error);
    }
  }

  // Manejar interacción botones
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const { customId, user, guild, channel } = interaction;

    if (customId === 'crear_ticket') {
      const nombreCanal = `ticket-${user.username.toLowerCase()}`.replace(/[^a-z0-9\-]/gi, '');

      const canalExistente = guild.channels.cache.find(c => c.name === nombreCanal);
      if (canalExistente) {
        return interaction.reply({
          content: '❗ Ya tienes un ticket abierto.',
          flags: 64
        });
      }

      const canal = await guild.channels.create({
        name: nombreCanal,
        type: ChannelType.GuildText,
        parent: categoriaTicketsId,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          ...staffRoleIds.map(roleId => ({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel]
          }))
        ]
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('cerrar_ticket')
          .setLabel('🔒 Cerrar Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('registrar_auditoria')
          .setLabel('📋 Registrar Auditoría')
          .setStyle(ButtonStyle.Secondary)
      );

      await canal.send({
        content: `👋 ¡Hola <@${user.id}>! Gracias por postular.\nUn miembro del staff te atenderá pronto.\n${staffRoleIds.map(id => `<@&${id}>`).join(' ')}`,
        components: [row]
      });

      // Registro auditoría apertura ticket
      await registrarAuditoria(guild, `📥 Ticket abierto: **${canal.name}**\nPor: <@${user.id}> (${user.tag})`);

      await interaction.reply({
        content: `✅ Se ha creado tu ticket en <#${canal.id}>.`,
        flags: 64
      });
    }

    if (customId === 'cerrar_ticket') {
      await interaction.reply('🔒 Este ticket será cerrado en 5 segundos...');
      // Registro auditoría cierre ticket
      await registrarAuditoria(guild, `🔒 Ticket cerrado: **${channel.name}**\nPor: <@${user.id}> (${user.tag})`);

      setTimeout(() => {
        channel.delete().catch(console.error);
      }, 5000);
    }

    if (customId === 'registrar_auditoria') {
      const canalAuditoria = guild.channels.cache.get(canalAuditoriaId);

      if (canalAuditoria) {
        canalAuditoria.send(`📋 Registro de auditoría:\nCanal: ${channel.name}\nPor: ${user.tag} (${user.id})`);
        interaction.reply({ content: '✅ Auditoría registrada.', flags: 64 });
      } else {
        interaction.reply({ content: '❌ No se encontró el canal de auditoría.', flags: 64 });
      }
    }
  });
};
