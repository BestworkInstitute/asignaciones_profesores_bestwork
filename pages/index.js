import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { asignarProfesores } from '../utils/asignador';
import EnviarHorarios from '../components/EnviarHorarios';

export default function Home() {
  const [profesores, setProfesores] = useState([]);
  const [talleresOriginales, setTalleresOriginales] = useState([]);
  const [talleresAsignados, setTalleresAsignados] = useState([]);

  // 🔧 Esta función va dentro del componente Home (debajo de generarInforme en PDF)
const renderDisponibilidadFinal = () => {
  const disponibilidadFinal = profesores.map(p => {
    const bloquesAsignados = talleresAsignados
      .filter(t => t.profesorAsignado === p.nombre)
      .map(t => t.idBloque);

    const disponiblesFinal = p.bloquesDisponibles.filter(b => !bloquesAsignados.includes(b));

    return [p.nombre, disponiblesFinal.join(', ')];
  });

  return renderTable(
    'Disponibilidad Final de Profesores',
    ['Profesor', 'Bloques Disponibles Restantes'],
    disponibilidadFinal,
    () => {
      const dataExcel = disponibilidadFinal.map(([nombre, disponibles]) => ({
        Profesor: nombre,
        DisponiblesFinales: disponibles
      }));
      exportToExcel(dataExcel, 'disponibilidad_final.xlsx');
    }
  );
};


  useEffect(() => {
    if (profesores.length > 0 && talleresOriginales.length > 0) {
      const asignados = asignarProfesores(profesores, talleresOriginales);
      setTalleresAsignados(asignados);
    }
  }, [profesores, talleresOriginales]);

  const leerArchivoProfesores = async (e) => {
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1);
  
    const parsed = rows.map(r => ({
      nombre: r[0],
      bloquesDisponibles: typeof r[1] === 'string' ? r[1].split(', ') : [],
      bloquesAsignados: parseInt(r[2], 10) || 0,
      correo: typeof r[4] === 'string' ? r[4].trim() : '',
      asignados: 0,
    }));
  
    setProfesores(parsed);
  };
  

  const leerArchivoBloques = async (e) => {
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1);
    const parsed = rows.map(r => ({
      bloque: r[0],
      curso: r[1],
      dia: r[2],
      idBloque: r[3],
      profesorAsignado: null
    }));
    setTalleresOriginales(parsed);
  };

  const exportToExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer], { type: "application/octet-stream" }), filename);
  };

  const generarInformePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Bestwork - Asignación de Talleres', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-CL')}`, 14, 28);


    autoTable(doc, {
      startY: 35,
      head: [['Nombre', 'Bloques Asignados', 'Bloques Disponibles']],
      body: profesores.map(p => [p.nombre, p.bloquesAsignados, p.bloquesDisponibles.join(', ')]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Curso', 'ID Bloque']],
      body: talleresOriginales.map(t => [t.curso, t.idBloque]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Curso', 'ID Bloque', 'Profesor Asignado']],
      body: talleresAsignados.map(t => [t.curso, t.idBloque, t.profesorAsignado || '—']),
    });

    // Resumen Final
    const resumen = {};
    talleresAsignados.forEach(t => {
      if (!t.profesorAsignado) return;
      if (!resumen[t.profesorAsignado]) {
        const prof = profesores.find(p => p.nombre === t.profesorAsignado);
        resumen[t.profesorAsignado] = {
          esperados: prof?.bloquesAsignados || 0,
          asignados: 0,
          bloques: new Set(),
          cursos: new Set()
        };
      }
      resumen[t.profesorAsignado].asignados++;
      resumen[t.profesorAsignado].bloques.add(t.idBloque);
      resumen[t.profesorAsignado].cursos.add(t.curso);
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Profesor', 'Bloques Esperados', 'Asignados', 'Bloques', 'Cursos']],
      body: Object.entries(resumen).map(([n, d]) => [
        n,
        d.esperados,
        d.asignados,
        [...d.bloques].join(', '),
        [...d.cursos].join(', ')
      ]),
    });

    // 🆕 NUEVO: Resumen detallado con día, bloque, curso
    const resumenDetalle = {};
    talleresAsignados.forEach(t => {
      if (!t.profesorAsignado) return;
      if (!resumenDetalle[t.profesorAsignado]) {
        resumenDetalle[t.profesorAsignado] = [];
      }
      resumenDetalle[t.profesorAsignado].push(`${t.dia} ${t.bloque} ${t.curso}`);
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Profesor', 'Cantidad de Bloques Asignados', 'Bloques']],
      body: Object.entries(resumenDetalle).map(([prof, bloques]) => [
        prof,
        bloques.length,
        bloques.join(' | ')
      ])
    });

    doc.save('informe_asignacion_profesores.pdf');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Segoe UI', background: '#f4f6f8' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <img src="https://bestwork.cl/wp-content/uploads/2023/05/Logo.png" alt="Bestwork" height="80" />
      </div>

      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Asignación de Talleres</h1>

      <section>
        <label><strong>Subir Profesores (.xlsx o .csv):</strong></label><br />
        <input type="file" accept=".xlsx,.csv" onChange={leerArchivoProfesores} style={styles.upload} />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <label><strong>Subir Talleres (.xlsx o .csv):</strong></label><br />
        <input type="file" accept=".xlsx,.csv" onChange={leerArchivoBloques} style={styles.upload} />
      </section>

      {profesores.length > 0 && renderTable(
        'Tabla de Profesores (DIM_PROFESORES)',
        ['Nombre', 'Bloques Asignados', 'Bloques Disponibles'],
        profesores.map(p => [p.nombre, p.bloquesAsignados, p.bloquesDisponibles.join(', ')]),
        () => exportToExcel(profesores, 'profesores.xlsx')
      )}

      {talleresOriginales.length > 0 && renderTable(
        'Tabla de Talleres Originales (TH_TALLERES)',
        ['Bloque', 'Curso', 'Día', 'ID Bloque'],
        talleresOriginales.map(t => [t.bloque, t.curso, t.dia, t.idBloque]),
        () => exportToExcel(talleresOriginales, 'bloques.xlsx')
      )}

      {talleresAsignados.length > 0 && renderTable(
        'Talleres con Profesor Asignado',
        ['Bloque', 'Curso', 'Día', 'ID Bloque', 'Profesor Asignado'],
        talleresAsignados.map(t => [t.bloque, t.curso, t.dia, t.idBloque, t.profesorAsignado || '—']),
        () => exportToExcel(talleresAsignados, 'talleres_asignados.xlsx')
      )}

      {/* RESUMEN FINAL */}
      {talleresAsignados.length > 0 && (() => {
        const resumen = {};
        talleresAsignados.forEach(t => {
          if (!t.profesorAsignado) return;
          if (!resumen[t.profesorAsignado]) {
            const prof = profesores.find(p => p.nombre === t.profesorAsignado);
            resumen[t.profesorAsignado] = {
              esperados: prof?.bloquesAsignados || 0,
              asignados: 0,
              bloques: new Set(),
              cursos: new Set()
            };
          }
          resumen[t.profesorAsignado].asignados++;
          resumen[t.profesorAsignado].bloques.add(t.idBloque);
          resumen[t.profesorAsignado].cursos.add(t.curso);
        });

        const datos = Object.entries(resumen).map(([n, d]) => [
          n,
          d.esperados,
          d.asignados,
          [...d.bloques].join(', '),
          [...d.cursos].join(', ')
        ]);

        return renderTable(
          'Resumen Final por Profesor',
          ['Profesor', 'Bloques Esperados', 'Asignados', 'Bloques', 'Cursos'],
          datos,
          () => {
            const datosExcel = Object.entries(resumen).map(([n, d]) => ({
              Profesor: n,
              Esperados: d.esperados,
              Asignados: d.asignados,
              Bloques: [...d.bloques].join(', '),
              Cursos: [...d.cursos].join(', ')
            }));
            exportToExcel(datosExcel, 'resumen_final.xlsx');
          }
        );
      })()}

      {talleresAsignados.length > 0 && (() => {
        const resumenPorProfesor = {};

        talleresAsignados.forEach(t => {
          if (!t.profesorAsignado) return;
          if (!resumenPorProfesor[t.profesorAsignado]) {
            resumenPorProfesor[t.profesorAsignado] = {
              cantidad: 0,
              bloques: []
            };
          }

          resumenPorProfesor[t.profesorAsignado].cantidad++;
          resumenPorProfesor[t.profesorAsignado].bloques.push(`${t.dia} ${t.bloque} ${t.curso}`);

        });

        const datos = Object.entries(resumenPorProfesor).map(([profesor, info]) => [
          profesor,
          info.cantidad,
          info.bloques.join(' | ')
        ]);

        return renderTable(
          'Resumen Detallado por Profesor (Día, Bloque, Curso)',
          ['Profesor', 'Cantidad de Bloques Asignados', 'Bloques Asignados'],
          datos,
          () => {
            const datosExcel = Object.entries(resumenPorProfesor).map(([profesor, info]) => ({
              Profesor: profesor,
              Cantidad: info.cantidad,
              Bloques: info.bloques.join(' | ')
            }));
            exportToExcel(datosExcel, 'resumen_detallado.xlsx');
          }
        );
      })()}
{talleresAsignados.length > 0 && renderDisponibilidadFinal()}
{talleresAsignados.length > 0 && (
  <EnviarHorarios
    profesores={profesores}
    talleresAsignados={talleresAsignados}
  />
)}


      {/* BOTÓN PDF */}
      {talleresAsignados.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={generarInformePDF} style={styles.buttonPDF}>
            📄 Descargar Informe PDF
          </button>
        </div>


      )}
    </div>
  );
}

const styles = {
  upload: {
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    marginBottom: '1rem',
    marginTop: '0.5rem',
  },
  buttonExport: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  buttonPDF: {
    backgroundColor: '#6c63ff',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
  }
};

function renderTable(title, headers, rows, onDownload) {
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2>{title}</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead style={{ background: '#d6e4f0' }}>
          <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => <td key={ci}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '1rem' }}>
        <button style={styles.buttonExport} onClick={onDownload}>⬇️ Descargar</button>
      </div>
    </section>
  );
}



