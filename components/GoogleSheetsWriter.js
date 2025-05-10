import { useEffect } from 'react';

export default function GoogleSheetsWriter({ talleresAsignados, disponibilidadFinal }) {
  useEffect(() => {
    const sendData = async () => {
      try {
        const res = await fetch('/api/googleSheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ talleresAsignados, disponibilidadFinal }),
        });
        const result = await res.json();
        console.log('✅ Datos enviados a Google Sheets:', result);
      } catch (err) {
        console.error('❌ Error al enviar a Google Sheets:', err);
      }
    };

    if (talleresAsignados.length > 0 && disponibilidadFinal.length > 0) {
      sendData();
    }
  }, [talleresAsignados, disponibilidadFinal]);

  return null;
}
