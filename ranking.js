const { ChannelType, EmbedBuilder } = require('discord.js');
const canalRankingId = '1402040622508146830'; // Canal top horas

async function iniciar(client) {
  try {
    const canal = await client.channels.fetch(canalRankingId).catch(() => null);
    if (!canal || canal.type !== ChannelType.GuildText) {
      console.error(`❌ No se encontró el canal de ranking (ID: ${canalRankingId}) o no es un canal de texto.`);
      return;
    }

    const mensajes = await canal.messages.fetch({ limit: 10 }).catch(() => null);
    let mensaje = mensajes?.find(m => m.author.id === client.user.id);
    if (!mensaje) {
      await canal.send({
        content: '**🏆 Ranking de Servicio**',
        embeds: [crearEmbedRanking([])]
      }).catch((error) => {
        console.error(`❌ Error al enviar mensaje de ranking (ID: ${canalRankingId}): ${error}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error al inicializar ranking: ${error}`);
  }
}

async function actualizarRanking(client, tiemposAcumulados) {
  try {
    const canal = await client.channels.fetch(canalRankingId).catch(() => null);
    if (!canal) {
      console.error(`❌ No se encontró el canal de ranking (ID: ${canalRankingId}).`);
      return;
    }

    const sorted = Array.from(tiemposAcumulados.entries()).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);

    const embed = crearEmbedRanking(top3);

    const mensajes = await canal.messages.fetch({ limit: 10 }).catch(() => null);
    const mensajeExistente = mensajes?.find(m => m.author.id === client.user.id);

    if (mensajeExistente) {
      await mensajeExistente.edit({ embeds: [embed] }).catch((error) => {
        console.error(`❌ Error al editar mensaje de ranking (ID: ${canalRankingId}): ${error}`);
      });
    } else {
      await canal.send({ embeds: [embed] }).catch((error) => {
        console.error(`❌ Error al enviar mensaje de ranking (ID: ${canalRankingId}): ${error}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error al actualizar ranking: ${error}`);
  }
}

function crearEmbedRanking(top) {
  const embed = new EmbedBuilder()
    .setTitle('🏆 Ranking de Servicio')
    .setColor('#FFD700')
    .setTimestamp();

  if (top.length === 0) {
    embed.setDescription('*Sin registros aún.*');
    return embed;
  }

  let descripcion = '';
  for (let i = 0; i < top.length; i++) {
    const [userId, tiempo] = top[i];
    descripcion += `**${i + 1}.** <@${userId}> - ⏱️ ${formatTiempo(tiempo)}\n`;
  }
  embed.setDescription(descripcion);
  return embed;
}

function formatTiempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;
  return `${horas}h ${minutos}m ${segs}s`;
}

module.exports = { iniciar, actualizarRanking };