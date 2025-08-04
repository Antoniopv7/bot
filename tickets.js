const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const canalPostulacionesId = '1398051755509551265';
const categoriaTicketsId = '1398053117018505216';
const canalAuditoriaId = '1398053198111182899';

async function iniciar(client) {
  const canalPostulaciones = await client.channels.fetch(canalPostulacionesId);

  if (canalPostulaciones) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('crear_ticket')
        .setLabel('🎫 Crear Ticket de Postulación')
        .setStyle(ButtonStyle.Success)
    );

    const mensaje = `📩 **¿Quieres postular a la LSPD?**\n\nPresiona el botón de abajo para abrir un ticket. Serás atendido por el equipo correspondiente.`;

    await canalPostulaciones.send({ content: mensaje, components: [row] }).catch(console.error);
  } else {
    console.log('❌ No se encontró el canal de postulaciones para enviar el mensaje inicial.');
  }
}

// Función para manejar las interacciones (botones)
async function onInteraction(interaction, client) {
  if (!interaction.isButton()) return false;

  try {
    console.log(`🔘 Botón pulsado: ${interaction.customId} por ${interaction.user.tag}`);

    if (interaction.customId === 'crear_ticket') {
      const user = interaction.user;
      const nombreCanal = `ticket-${user.username.toLowerCase()}`.replace(/[^a-z0-9\-]/gi, '');

      // Verificar existencia categoría
      const categoria = await interaction.guild.channels.fetch(categoriaTicketsId).catch(() => null);
      if (!categoria) {
        console.log('❌ No se encontró la categoría para tickets.');
        await interaction.reply({ content: '❌ No se pudo encontrar la categoría para crear tickets.', ephemeral: true });
        return true;
      }

      // Buscar canal existente
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
            id: '1397827547668025508', // Staff role 1
            allow: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: '1398025581848821873', // Staff role 2
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
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
        content: `👋 ¡Hola <@${user.id}>! Gracias por postular.\nUn miembro del staff te atenderá pronto.\n<@1397827547668025508> <@1398025581848821873>`,
        components: [row]
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
      setTimeout(() => canal.delete().catch(() => {}), 5000);
      console.log(`🟡 Ticket cerrado: ${canal.name}`);
      return true;
    }

    if (interaction.customId === 'registrar_auditoria') {
      const canal = interaction.channel;
      const user = interaction.user;
      const canalAuditoria = interaction.guild.channels.cache.get(canalAuditoriaId);

      if (canalAuditoria) {
        canalAuditoria.send(`📋 Registro de auditoría:\nCanal: ${canal.name}\nPor: ${user.tag} (${user.id})`);
        await interaction.reply({ content: '✅ Auditoría registrada.', ephemeral: true });
        console.log(`🟢 Auditoría registrada en canal ${canalAuditoria.name} por ${user.tag}`);
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de auditoría.', ephemeral: true });
        console.log('❌ No se encontró el canal de auditoría para registrar.');
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
