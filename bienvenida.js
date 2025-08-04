module.exports = async (member) => {
  // ID del canal de bienvenida
  const canalBienvenidaId = '1397827043869069323';
  const canalBienvenida = member.guild.channels.cache.get(canalBienvenidaId);

  if (canalBienvenida) {
    canalBienvenida.send(`👋 ¡Bienvenido/a ${member.user.username} a Los Santos Police Department de Pachavice RP!

Por favor, te invitamos a leer las **normativas y reglas** del servidor para mantener una buena convivencia.

Si deseas unirte a la facción, no dudes en abrir un ticket en el canal de **postulación**.

¡Disfruta tu estadía! 🚓`);
  } else {
    console.log('❌ Canal de bienvenida no encontrado.');
  }

  // ID del rol Ciudadano
  const rolCiudadanoId = '1398043027083104316';
  const rol = member.guild.roles.cache.get(rolCiudadanoId);

  if (rol) {
    try {
      await member.roles.add(rol);
      console.log(`✅ Rol Ciudadano asignado a ${member.user.tag}`);
    } catch (error) {
      console.error(`❌ Error asignando rol: ${error}`);
    }
  } else {
    console.log('❌ No se encontró el rol "Ciudadano".');
  }
};
