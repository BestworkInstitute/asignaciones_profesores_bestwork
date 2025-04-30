import React, { useState } from 'react';
import { format, nextMonday } from 'date-fns'; // eliminamos addDays porque no se usa
import es from 'date-fns/locale/es';

export default function EnviarHorarios({ profesores, talleresAsignados }) {
  const [estadoEnvio, setEstadoEnvio] = useState({});
  const [fechaLimite, setFechaLimite] = useState('');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [modo, setModo] = useState('original');
  const [enviando, setEnviando] = useState(false);

  const lunes = nextMonday(new Date());
  const semanaTexto = `semana del ${format(lunes, "dd/MM/yyyy", { locale: es })}`;

  const handleEnviar = async () => {
    if (!fechaLimite) {
      alert("Por favor ingresa una fecha límite de confirmación.");
      return;
    }

    setEnviando(true);

    for (const prof of profesores) {
      if (!prof.correo || !prof.correo.includes('@')) {
        console.warn(`⛔ Sin correo válido para ${prof.nombre}`);
        continue;
      }

      const bloques = talleresAsignados
        .filter(t => t.profesorAsignado === prof.nombre)
        .map(t => `- ${t.dia} ${t.bloque} ${t.curso}`)
        .join('\n');

      const resumenBloques = bloques || '- No tiene bloques asignados esta semana -';

      let mensajeFinal = '';

      if (modo === 'original') {
        mensajeFinal = `
Profesor(a): ${prof.nombre}

Junto con saludar, enviamos las asignaciones de la ${semanaTexto}.

Para confirmar asignaciones ingresar al siguiente link, el que nos llevará al Campus Virtual donde desplegando la pestaña “General” veremos “Confirmación de Carga Académica”, lugar donde además también debemos mencionar, si es el caso, el día y la hora de la asignación que no pueden tomar.

IMPORTANTE: El plazo para confirmar las asignaciones es hasta el ${fechaLimite} a las 17:00 Hrs. De no haber confirmado se considerará que no puede asistir a ningún taller y estos serán reasignados.

IMPORTANTE: Al realizar un taller NO ingresar como invitado ni con una cuenta personal de Zoom, de tal forma no podrá iniciar el taller.

Ingresar primero a la página de Zoom, asegurarnos que no hay ninguna sesión abierta,
cerrar si las hay e iniciar sesión con la sala que le corresponde al taller a realizar.
Luego, recién ir al campus, ir al nivel del taller a cubrir y hacer clic en el link de Zoom respectivo.

Resumen de Bloques Semanal:
${resumenBloques}

Link: https://campusvirtual.bestwork.cl/course/view.php?id=233
        `.trim();
      } else {
        mensajeFinal = `
${mensajePersonalizado.trim()}

Resumen de Bloques asignados:
${resumenBloques}
        `.trim();
      }

      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: prof.correo,
            subject: `Horarios Captación en Terreno - ${prof.nombre}`,
            text: mensajeFinal,
            from: 'ftobar@bestwork.cl',
          }),
        });

        if (res.ok) {
          setEstadoEnvio(prev => ({ ...prev, [prof.nombre]: '✅ Enviado' }));
        } else {
          setEstadoEnvio(prev => ({ ...prev, [prof.nombre]: '❌ Error al enviar' }));
        }
      } catch (error) {
        console.error(error);
        setEstadoEnvio(prev => ({ ...prev, [prof.nombre]: '❌ Error de red' }));
      }
    }

    setEnviando(false);
  };

  return (
    <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#fff', borderRadius: '8px' }}>
      <h2>📤 Enviar horarios por correo</h2>
      <p>Si la asignación está correcta, puedes enviar la información a cada profesor.</p>

      <div style={{ marginBottom: '1rem' }}>
        <label><strong>Fecha límite de confirmación:</strong></label>
        <input
          type="text"
          value={fechaLimite}
          onChange={(e) => setFechaLimite(e.target.value)}
          placeholder="Ej: Viernes 21/03/2025 a las 18:00 hrs"
          style={{ width: '100%', padding: '8px', marginTop: '6px' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label><strong>Selecciona el modo de mensaje:</strong></label><br />
        <button
          onClick={() => setModo('original')}
          disabled={modo === 'original'}
          style={modo === 'original' ? styles.buttonSelected : styles.button}
        >
          Usar plantilla original
        </button>
        <button
          onClick={() => setModo('personalizado')}
          disabled={modo === 'personalizado'}
          style={modo === 'personalizado' ? styles.buttonSelected : styles.button}
        >
          Escribir mensaje personalizado
        </button>
      </div>

      {modo === 'personalizado' && (
        <div style={{ marginBottom: '1rem' }}>
          <label><strong>Mensaje personalizado:</strong></label>
          <textarea
            value={mensajePersonalizado}
            onChange={(e) => setMensajePersonalizado(e.target.value)}
            rows={6}
            placeholder="Escribe tu mensaje aquí..."
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>
      )}

      <button
        onClick={handleEnviar}
        disabled={enviando || !fechaLimite}
        style={{
          backgroundColor: enviando ? '#999' : '#28a745',
          color: '#fff',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: enviando ? 'not-allowed' : 'pointer',
          marginTop: '1rem'
        }}
      >
        {enviando ? 'Enviando correos...' : '📧 SEGUIR Y ENVIAR CORREOS'}
      </button>

      <div style={{ marginTop: '2rem' }}>
        {Object.entries(estadoEnvio).map(([nombre, estado], i) => (
          <p key={i}><strong>{nombre}</strong>: {estado}</p>
        ))}
      </div>
    </div>
  );
}

const styles = {
  button: {
    marginRight: '10px',
    padding: '8px 16px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    backgroundColor: '#eee',
    cursor: 'pointer'
  },
  buttonSelected: {
    marginRight: '10px',
    padding: '8px 16px',
    borderRadius: '5px',
    border: '2px solid #007bff',
    backgroundColor: '#d0e7ff',
    cursor: 'default'
  }
};
