import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '178Bzvl7PUwHMr8xgCJ8o5ma25f3UGN49JBkYDKkJ6UM';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { talleresAsignados, disponibilidadFinal } = req.body;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 🧹 Borrar hojas antes de escribir
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TALLERES ASIGNADOS PROFESORES',
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DISPONIBILIDAD FINAL PROFESORES',
    });

    // 📤 Enviar talleres asignados
    const talleresValues = [
      ['Bloque', 'Curso', 'Día', 'ID Bloque', 'Profesor Asignado'],
      ...talleresAsignados.map(t => [
        t.bloque,
        t.curso,
        t.dia,
        t.idBloque,
        t.profesorAsignado || '—'
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TALLERES ASIGNADOS PROFESORES',
      valueInputOption: 'RAW',
      requestBody: { values: talleresValues },
    });

    // 📤 Enviar disponibilidad final
    const disponibilidadValues = [
      ['Profesor', 'Bloques Disponibles Restantes'],
      ...disponibilidadFinal,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'DISPONIBILIDAD FINAL PROFESORES',
      valueInputOption: 'RAW',
      requestBody: { values: disponibilidadValues },
    });

    res.status(200).json({
      status: 'OK',
      uploaded: {
        talleres: talleresValues.length - 1,
        disponibilidad: disponibilidadValues.length - 1
      }
    });
  } catch (err) {
    console.error('❌ Error Google Sheets API:', err);
    res.status(500).json({ error: 'Google Sheets API failed', message: err.message });
  }
}
