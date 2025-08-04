const { ChannelType, EmbedBuilder } = require('discord.js');
const canalRankingId = '1398072037406408825'; // Canal de ranking

async function iniciar(client) {
  const canal = await client.channels.fetch(canalRankingId);
  if (!canal || canal.type !== ChannelType.GuildText) return;

  // Mensaje inicial para el ranking (opcional)
  const mensajes = await canal.messages.fetch({ limit: 10 });
  let mensaje = mensajes.find(m => m.author.id === client.user.id);
  if (!mensaje) {
    await canal.send({
      content: '**🏆 Ranking de Servicio**',
      embeds: [crearEmbedRanking([])]
    });
  }
}

async function actualizarRanking(client, tiemposAcumulados) {
  const canal = await client.channels.fetch(canalRankingId);
  if (!canal) return;

  const sorted = Array.from(tiemposAcumulados.entries()).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3);

  const embed = crearEmbedRanking(top3);

  const mensajes = await canal.messages.fetch({ limit: 10 });
  const mensajeExistente = mensajes.find(m => m.author.id === client.user.id);

  if (mensajeExistente) {
    await mensajeExistente.edit({ embeds: [embed] });
  } else {
    await canal.send({ embeds: [embed] });
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
