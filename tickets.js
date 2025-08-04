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

async function iniciar(client) {
  try {
    const canalPostulaciones = await client.channels.fetch(canalPostulacionesId).catch(() => null);
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
  } catch (error) {
    console.error(`❌ Error al inicializar tickets: ${error}`);
  }
}

async function onInteraction(interaction, client) {
  if (!interaction.isButton()) return false;

  try {
    console.log(`🔘 Botón pulsado: ${interaction.customId} por ${interaction.user.tag}`);

    if (interaction.customId === 'crear_ticket') {
      const user = interaction.user;
      const nombreCanal = `ticket-${user.username.toLowerCase()}`.replace(/[^a-z0-9\-]/gi, '');

      const categoria = await interaction.guild.channels.fetch(categoriaTicketsId).catch(() => null);
      if (!categoria || categoria.type !== ChannelType.GuildCategory) {
        console.error(`❌ No se encontró la categoría para tickets (ID: ${categoriaTicketsId}) o no es una categoría.`);
        await interaction.reply({ content: '❌ No se pudo encontrar la categoría para crear tickets.', ephemeral: true });
        return true;
      }

      const canalExistente = interaction.guild.channels.cache.find(c => c.name === nombreCanal);
      if (canalExistente) {
        await interaction.reply({
          content: '❗ Ya tienes un ticket abierto.',
          ephemeral: true
        });
        console.log(`⚠️ Usuario ${user.tag} intentó abrir ticket pero ya tiene uno.`);
        return true;
      }

      const canal = await interaction.guild.channels.create({
        name: nombreCanal,
        type: ChannelType.GuildText,
        parent: categoriaTicketsId,
        permissionOverwrites: [
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
          {
            id: '1401652584221249588', // Rol Administrador
            allow: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: '1402042683366572032', // Rol Staff
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      }).catch((error) => {
        console.error(`❌ Error al crear canal de ticket: ${error}`);
        throw error;
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
        content: `👋 ¡Hola <@${user.id}>! Gracias por postular.\nUn miembro del staff te atenderá pronto.\n<@&1401652584221249588> <@&1402042683366572032>`,
        components: [row]
      }).catch((error) => {
        console.error(`❌ Error al enviar mensaje al ticket: ${error}`);
      });

      await interaction.reply({
        content: `✅ Se ha creado tu ticket en <#${canal.id}>.`,
        ephemeral: true
      });

      console.log(`🟢 Ticket creado: ${nombreCanal} para usuario ${user.tag}`);
      return true;
    }

    if (interaction.customId === 'cerrar_ticket') {
      const canal = interaction.channel;
      await interaction.reply('🔒 Este ticket será cerrado en 5 segundos...');
      setTimeout(() => canal.delete().catch(() => console.error(`❌ Error al cerrar ticket: ${canal.name}`)), 5000);
      console.log(`🟡 Ticket cerrado: ${canal.name}`);
      return true;
    }

    if (interaction.customId === 'registrar_auditoria') {
      const canal = interaction.channel;
      const user = interaction.user;
      const canalAuditoria = interaction.guild.channels.cache.get(canalAuditoriaId);

      if (canalAuditoria) {
        await canalAuditoria.send(`📋 Registro de auditoría:\nCanal: ${canal.name}\nPor: ${user.tag} (${user.id})`);
        await interaction.reply({ content: '✅ Auditoría registrada.', ephemeral: true });
        console.log(`🟢 Auditoría registrada en canal ${canalAuditoria.name} por ${user.tag}`);
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de auditoría.', ephemeral: true });
        console.error(`❌ No se encontró el canal de auditoría (ID: ${canalAuditoriaId}).`);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error en onInteraction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Ocurrió un error al procesar la interacción.', ephemeral: true });
    }
    return true;
  }
}

module.exports = { iniciar, onInteraction };