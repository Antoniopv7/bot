const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const canalPostulacionesId = '1402040366282047609'; // Canal #postulaciones
const categoriaTicketsId = '1401657156935356558'; // Categoría Tickets
const canalAuditoriaId = '1402039588108636242'; // Canal #auditoria
const staffRoleIds = ['1401652584221249588', '1402042683366572032', '1402043308834033705']; // Administrador, Staff, Instructor

async function iniciar(client) {
  try {
    console.log(`🔍 Inicializando tickets en canal ${canalPostulacionesId}`);
    const canalPostulaciones = await client.channels.fetch(canalPostulacionesId).catch((error) => {
      console.error(`❌ Error al obtener canal de postulaciones (ID: ${canalPostulacionesId}): ${error}`);
      return null;
    });
    if (!canalPostulaciones || canalPostulaciones.type !== ChannelType.GuildText) {
      console.error(`❌ No se encontró el canal de postulaciones (ID: ${canalPostulacionesId}) o no es un canal de texto.`);
      return;
    }
    console.log(`✅ Canal de postulaciones encontrado: ${canalPostulaciones.name}`);

    console.log(`🔍 Limpiando mensajes anteriores del bot en ${canalPostulaciones.name}`);
    const mensajes = await canalPostulaciones.messages.fetch({ limit: 10 }).catch((error) => {
      console.error(`❌ Error al obtener mensajes en ${canalPostulaciones.name}: ${error}`);
      return null;
    });
    if (mensajes) {
      const mensajesBot = mensajes.filter(msg => msg.author.id === client.user.id);
      for (const mensaje of mensajesBot.values()) {
        await mensaje.delete().catch((error) => console.error(`❌ Error al eliminar mensaje: ${error}`));
      }
    }
    console.log(`✅ Mensajes anteriores limpiados`);

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
    console.log(`✅ Mensaje de postulaciones enviado en ${canalPostulaciones.name}`);
  } catch (error) {
    console.error(`❌ Error al inicializar tickets: ${error.stack}`);
  }
}

async function onInteraction(interaction, client) {
  if (!interaction.isButton()) return false;

  try {
    const { customId, user, guild, channel } = interaction;
    console.log(`🔘 Botón pulsado: ${customId} por ${user.tag} en servidor ${guild?.name || 'desconocido'}`);

    if (customId === 'crear_ticket') {
      console.log(`🔍 Procesando creación de ticket para ${user.tag}`);
      const nombreCanal = `ticket-${user.username.toLowerCase()}`.replace(/[^a-z0-9\-]/gi, '');
      console.log(`🔍 Nombre del canal de ticket: ${nombreCanal}`);

      console.log(`🔍 Verificando si existe un canal con nombre ${nombreCanal}`);
      const canalExistente = guild.channels.cache.find(c => c.name === nombreCanal);
      if (canalExistente) {
        await interaction.reply({
          content: `❗ Ya tienes un ticket abierto: <#${canalExistente.id}>.`,
          ephemeral: true
        });
        console.log(`⚠️ Usuario ${user.tag} intentó abrir ticket pero ya tiene uno: ${canalExistente.name}`);
        return true;
      }
      console.log(`✅ No existe canal previo para ${nombreCanal}`);

      console.log(`🔍 Verificando categoría ${categoriaTicketsId}`);
      const categoria = await guild.channels.fetch(categoriaTicketsId).catch((error) => {
        console.error(`❌ Error al obtener categoría (ID: ${categoriaTicketsId}): ${error}`);
        return null;
      });
      if (!categoria || categoria.type !== ChannelType.GuildCategory) {
        console.error(`❌ No se encontró la categoría para tickets (ID: ${categoriaTicketsId}) o no es una categoría.`);
        await interaction.reply({ content: '❌ No se pudo encontrar la categoría para crear tickets.', ephemeral: true });
        return true;
      }
      console.log(`✅ Categoría encontrada: ${categoria.name}`);

      console.log(`🔍 Creando canal de ticket en categoría ${categoriaTicketsId}`);
      const permissionOverwrites = [
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
      ];

      const canal = await guild.channels.create({
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

      const staffMentions = staffRoleIds.map(id => `<@&${id}>`).join(' ');
      console.log(`🔍 Enviando mensaje inicial en canal ${canal.name}`);
      await canal.send({
        content: `👋 ¡Hola <@${user.id}>! Gracias por postular.\nUn miembro del staff te atenderá pronto.\n${staffMentions}`,
        components: [row]
      }).catch((error) => {
        console.error(`❌ Error al enviar mensaje al ticket (${canal.name}): ${error}`);
      });
      console.log(`✅ Mensaje enviado en ${canal.name}`);

      await registrarAuditoria(guild, `📥 Ticket abierto: **${canal.name}**\nPor: <@${user.id}> (${user.tag})\nFecha: ${new Date().toISOString()}`);

      await interaction.reply({
        content: `✅ Se ha creado tu ticket en <#${canal.id}>.`,
        ephemeral: true
      });
      console.log(`🟢 Ticket creado: ${canal.name} para usuario ${user.tag}`);
      return true;
    }

    if (customId === 'cerrar_ticket') {
      console.log(`🔍 Cerrando ticket ${channel.name} por ${user.tag}`);
      await interaction.reply('🔒 Este ticket será cerrado en 5 segundos...');

      await registrarAuditoria(guild, `🔒 Ticket cerrado: **${channel.name}**\nPor: <@${user.id}> (${user.tag})\nFecha: ${new Date().toISOString()}`);

      setTimeout(() => {
        channel.delete().catch((error) => console.error(`❌ Error al cerrar ticket (${channel.name}): ${error}`));
      }, 5000);
      console.log(`🟡 Ticket cerrado: ${channel.name}`);
      return true;
    }

    if (customId === 'registrar_auditoria') {
      console.log(`🔍 Registrando auditoría manual en ${channel.name} por ${user.tag}`);
      await registrarAuditoria(guild, `📋 Registro de auditoría manual:\nCanal: ${channel.name}\nPor: ${user.tag} (${user.id})\nFecha: ${new Date().toISOString()}`);
      await interaction.reply({ content: '✅ Auditoría registrada.', ephemeral: true });
      console.log(`🟢 Auditoría manual registrada por ${user.tag}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error en onInteraction para ${customId}: ${error.stack}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocurrió un error al procesar la interacción.', ephemeral: true }).catch((err) => {
        console.error(`❌ Error al responder interacción: ${err}`);
      });
    }
    return true;
  }
}

async function registrarAuditoria(guild, texto) {
  try {
    console.log(`🔍 Enviando auditoría a canal ${canalAuditoriaId}`);
    const canalAuditoria = guild.channels.cache.get(canalAuditoriaId);
    if (canalAuditoria) {
      await canalAuditoria.send(texto).catch((error) => {
        console.error(`❌ Error al enviar auditoría a ${canalAuditoriaId}: ${error}`);
      });
      console.log(`✅ Auditoría enviada: ${texto}`);
    } else {
      console.error(`❌ No se encontró el canal de auditoría (ID: ${canalAuditoriaId}).`);
    }
  } catch (error) {
    console.error(`❌ Error en registrarAuditoria: ${error.stack}`);
  }
}

module.exports = { iniciar, onInteraction };