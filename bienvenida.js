module.exports = async (member) => {
  const canalBienvenidaId = '1401645362225348700'; // Canal de bienvenida
  const canalBienvenida = member.guild.channels.cache.get(canalBienvenidaId);

  if (canalBienvenida) {
    try {
      await canalBienvenida.send(`👋 ¡Bienvenido/a ${member.user.username} a Los Santos Police Department de Pachavice RP!\n\nPor favor, te invitamos a leer las **normativas y reglas** del servidor para mantener una buena convivencia.\n\nSi deseas unirte a la facción, no dudes en abrir un ticket en el canal de **postulación**.\n\n¡Disfruta tu estadía! 🚓`);
    } catch (error) {
      console.error(`❌ Error al enviar mensaje de bienvenida (ID: ${canalBienvenidaId}): ${error}`);
    }
  } else {
    console.error(`❌ Canal de bienvenida no encontrado (ID: ${canalBienvenidaId}).`);
  }

  const rolCiudadanoId = '1402043467282251878'; // Rol Civil
  const rol = member.guild.roles.cache.get(rolCiudadanoId);

  if (rol) {
    try {
      await member.roles.add(rol);
      console.log(`✅ Rol Civil asignado a ${member.user.tag}`);
    } catch (error) {
      console.error(`❌ Error asignando rol Civil (ID: ${rolCiudadanoId}): ${error}`);
    }
  } else {
    console.error(`❌ No se encontró el rol Civil (ID: ${rolCiudadanoId}).`);
  }
};