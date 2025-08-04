const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const canalPostulacionesId = '1402040366282047609'; // Canal postulaciones
const categoriaTicketsId = '1401657156935356558'; // Categoría Tickets
const canalAuditoriaId = '1402039588108636242'; // Canal auditoria
const staffRoleIds = ['1401652584221249588', '1402042683366572032', '1402043308834033705']; // Administrador, Staff, Instructor

async function iniciar(client) {
  try {
    console.log(`🔍 Intentando inicializar tickets en canal ${canalPostulacionesId}`);
    const canalPostulaciones = await client.channels.fetch(canalPostulacionesId).catch((error) => {
      console.error(`❌ Error al obtener canal de postulaciones (ID: ${canalPostulacionesId}): ${error}`);
      return null;
    });
    if (!canalPostulaciones || canalPostulaciones.type !== ChannelType.GuildText) {
      console.error(`❌ No se encontró el canal de postulaciones (ID: ${canalPostulacionesId}) o no es un canal de texto.`);
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('crear_ticket')
        .setLabel('🎫 Crear Ticket de Postulación')
        .setStyle(ButtonStyle.Success)
    );

    const mensaje = `📩 **¿Quieres postular a la LSPD?**\n\nPresiona el botón de abajo para abrir un ticket. Serás atendido por el equipo correspondiente.`;

    await canalPostulaciones.send({ content: mensaje, components: [row] }).catch((error) => {
      console.error(`❌ Error al enviar mensaje al canal de postulaciones (ID: ${canalPostulacionesId}): ${error}`);
    });
    console.log(`✅ Mensaje de postulaciones enviado en canal ${canalPostulacionesId}`);
  } catch (error) {
    console.error(`❌ Error al inicializar tickets: ${error.stack}`);
  }
}

async function onInteraction(interaction, client) {
  if (!interaction.isButton()) return false;

  try {
    console.log(`🔘 Botón pulsado: ${interaction.customId} por ${interaction.user.tag} en servidor ${interaction.guild?.name || 'desconocido'}`);

    if (interaction.customId === 'crear_ticket') {
      console.log(`🔍 Procesando creación de ticket para ${interaction.user.tag}`);
      const user = interaction.user;
      const nombreCanal = `ticket-${user.username.toLowerCase()}`.replace(/[^a-z0-9\-]/gi, '');
      console.log(`🔍 Nombre del canal de ticket: ${nombreCanal}`);

      console.log(`🔍 Obteniendo categoría ${categoriaTicketsId}`);
      const categoria = await interaction.guild.channels.fetch(categoriaTicketsId).catch((error) => {
        console.error(`❌ Error al obtener categoría (ID: ${categoriaTicketsId}): ${error}`);
        return null;
      });
      if (!categoria || categoria.type !== ChannelType.GuildCategory) {
        console.error(`❌ No se encontró la categoría para tickets (ID: ${categoriaTicketsId}) o no es una categoría.`);
        await interaction.reply({ content: '❌ No se pudo encontrar la categoría para crear tickets.', ephemeral: true });
        return true;
      }
      console.log(`✅ Categoría encontrada: ${categoria.name}`);

      console.log(`🔍 Verificando si existe un canal con nombre ${nombreCanal}`);
      const canalExistente = interaction.guild.channels.cache.find(c => c.name === nombreCanal);
      if (canalExistente) {
        await interaction.reply({
          content: `❗ Ya tienes un ticket abierto: <#${canalExistente.id}>.`,
          ephemeral: true
        });
        console.log(`⚠️ Usuario ${user.tag} intentó abrir ticket pero ya tiene uno: ${canalExistente.name}`);
        return true;
      }
      console.log(`✅ No existe canal previo para ${nombreCanal}`);

      console.log(`🔍 Creando canal de ticket en categoría ${categoriaTicketsId}`);
      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone,
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
      ];

      const canal = await interaction.guild.channels.create({
        name: nombreCanal,
        type: ChannelType.GuildText,
        parent: categoriaTicketsId,
        permissionOverwrites
      }).catch((error) => {
        console.error(`❌ Error al crear canal de ticket (${nombreCanal}): ${error}`);
        throw error;
      });
      console.log(`✅ Canal creado: ${canal.name}`);

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

      const staffMentions = staffRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
      console.log(`🔍 Enviando mensaje inicial en canal ${canal.name}`);
      await canal.send({
        content: `👋 ¡Hola <@${user.id}>! Gracias por postular.\nUn miembro del staff te atenderá pronto.\n${staffMentions}`,
        components: [row]
      }).catch((error) => {
        console.error(`❌ Error al enviar mensaje al ticket (${canal.name}): ${error}`);
      });
      console.log(`✅ Mensaje enviado en canal ${canal.name}`);

      await interaction.reply({
        content: `✅ Se ha creado tu ticket en <#${canal.id}>.`,
        ephemeral: true
      });
      console.log(`🟢 Ticket creado: ${nombreCanal} para usuario ${user.tag}`);
      return true;
    }

    if (interaction.customId === 'cerrar_ticket') {
      const canal = interaction.channel;
      const user = interaction.user;
      console.log(`🔍 Cerrando ticket ${canal.name} por ${user.tag}`);

      console.log(`🔍 Registrando auditoría automática para cierre de ticket ${canal.name}`);
      const canalAuditoria = interaction.guild.channels.cache.get(canalAuditoriaId);
      if (canalAuditoria) {
        await canalAuditoria.send(`📋 Auditoría automática (cierre de ticket):\nCanal: ${canal.name}\nCerrado por: ${user.tag} (${user.id})\nFecha: ${new Date().toISOString()}`);
        console.log(`🟢 Auditoría automática registrada en canal ${canalAuditoria.name} por ${user.tag}`);
      } else {
        console.error(`❌ No se encontró el canal de auditoría (ID: ${canalAuditoriaId}) para auditoría automática.`);
      }

      await interaction.reply('🔒 Este ticket será cerrado en 5 segundos...');
      setTimeout(() => canal.delete().catch((error) => console.error(`❌ Error al cerrar ticket (${canal.name}): ${error}`)), 5000);
      console.log(`🟡 Ticket cerrado: ${canal.name}`);
      return true;
    }

    if (interaction.customId === 'registrar_auditoria') {
      const canal = interaction.channel;
      const user = interaction.user;
      console.log(`🔍 Registrando auditoría manual en canal ${canal.name} por ${user.tag}`);
      const canalAuditoria = interaction.guild.channels.cache.get(canalAuditoriaId);

      if (canalAuditoria) {
        await canalAuditoria.send(`📋 Registro de auditoría manual:\nCanal: ${canal.name}\nPor: ${user.tag} (${user.id})\nFecha: ${new Date().toISOString()}`);
        await interaction.reply({ content: '✅ Auditoría registrada.', ephemeral: true });
        console.log(`🟢 Auditoría manual registrada en canal ${canalAuditoria.name} por ${user.tag}`);
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de auditoría.', ephemeral: true });
        console.error(`❌ No se encontró el canal de auditoría (ID: ${canalAuditoriaId}).`);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error en onInteraction para ${interaction.customId}: ${error.stack}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocurrió un error al procesar la interacción.', ephemeral: true }).catch((err) => {
        console.error(`❌ Error al responder interacción: ${err}`);
      });
    }
    return true;
  }
}

module.exports = { iniciar, onInteraction };