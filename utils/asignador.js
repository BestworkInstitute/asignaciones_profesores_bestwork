export function asignarProfesores(profesoresOriginal, bloquesOriginales) {
  const bloques = bloquesOriginales.map(b => ({ ...b }));
  const profesores = profesoresOriginal.map(p => ({
    ...p,
    bloquesDisponibles: Array.isArray(p.bloquesDisponibles)
      ? p.bloquesDisponibles
      : typeof p.bloquesDisponibles === 'string'
        ? p.bloquesDisponibles.split(',').map(b => b.trim())
        : [],
    asignados: 0,
    bloquesOcupados: new Set(),
    bloquesEsperados: p.bloquesAsignados
  }));

  const BLOQUES_PROTEGIDOS = new Set();

  // 🔹 1. Asignar SA09 y SA11 pareados sin duplicación ni donación
  let sa09Libres = bloques.filter(b => b.idBloque === 'SA09' && !b.profesorAsignado);
  let sa11Libres = bloques.filter(b => b.idBloque === 'SA11' && !b.profesorAsignado);

  const profesoresSA = profesores.filter(p =>
    p.bloquesDisponibles.includes('SA09') &&
    p.bloquesDisponibles.includes('SA11')
  );

  const usadosSA = new Set();

  for (const prof of profesoresSA) {
    if (prof.asignados + 2 > prof.bloquesEsperados) continue;
    if (usadosSA.has(prof.nombre)) continue;

    const sa09 = sa09Libres.shift();
    const sa11 = sa11Libres.shift();
    if (sa09 && sa11) {
      sa09.profesorAsignado = prof.nombre;
      sa11.profesorAsignado = prof.nombre;
      prof.bloquesOcupados.add('SA09');
      prof.bloquesOcupados.add('SA11');
      prof.asignados += 2;

      BLOQUES_PROTEGIDOS.add(sa09);
      BLOQUES_PROTEGIDOS.add(sa11);
      usadosSA.add(prof.nombre);
    }
  }

  // 🔹 2. Ivette full prioridad
  const ivette = profesores.find(p => p.nombre.includes('Ivette Lissette Aguirre Reyes'));
  if (ivette) {
    for (const bloque of ivette.bloquesDisponibles) {
      if (ivette.asignados >= ivette.bloquesEsperados) break;
      if (ivette.bloquesOcupados.has(bloque)) continue;

      const taller = bloques.find(t =>
        t.idBloque === bloque &&
        !t.profesorAsignado &&
        t.idBloque !== 'SA09' &&
        t.idBloque !== 'SA11'
      );

      if (taller) {
        taller.profesorAsignado = ivette.nombre;
        ivette.bloquesOcupados.add(bloque);
        ivette.asignados++;
      }
    }
  }

  // 🔺 Alta carga
  const altaCarga = profesores
    .filter(p => p.bloquesEsperados >= 10 && p.nombre !== ivette?.nombre)
    .sort((a, b) => b.bloquesEsperados - a.bloquesEsperados);

  asignarPorOrden(altaCarga);

  // 🔹 Media carga
  const mediaCarga = profesores
    .filter(p => p.bloquesEsperados >= 5 && p.bloquesEsperados < 10 && p.nombre !== ivette?.nombre)
    .sort((a, b) => b.bloquesEsperados - a.bloquesEsperados);

  asignarPorOrden(mediaCarga);

  // 🔻 Baja carga
  const bajaCarga = profesores
    .filter(p => p.bloquesEsperados < 5 && p.nombre !== ivette?.nombre)
    .sort((a, b) => a.bloquesEsperados - b.bloquesEsperados);

  asignarPorOrden(bajaCarga);

  // 🔁 Redistribuir de baja carga hacia incompletos
  const incompletos = profesores.filter(p =>
    p.asignados < p.bloquesEsperados && p.bloquesEsperados >= 5
  );

  for (const incompleto of incompletos) {
    const faltantes = incompleto.bloquesEsperados - incompleto.asignados;

    for (let i = 0; i < faltantes; i++) {
      const donador = bajaCarga.find(d =>
        d.asignados > 0 &&
        d.bloquesDisponibles.some(b =>
          incompleto.bloquesDisponibles.includes(b) &&
          !incompleto.bloquesOcupados.has(b) &&
          !['SA09', 'SA11'].includes(b)
        )
      );

      if (donador) {
        const bloqueDonable = [...donador.bloquesOcupados].find(b =>
          incompleto.bloquesDisponibles.includes(b) &&
          !incompleto.bloquesOcupados.has(b) &&
          !['SA09', 'SA11'].includes(b)
        );

        if (bloqueDonable) {
          const taller = bloques.find(b => b.idBloque === bloqueDonable);
          if (taller && !BLOQUES_PROTEGIDOS.has(taller)) {
            taller.profesorAsignado = incompleto.nombre;
            donador.bloquesOcupados.delete(bloqueDonable);
            donador.asignados--;
            incompleto.bloquesOcupados.add(bloqueDonable);
            incompleto.asignados++;
          }
        }
      }
    }
  }

  // 🧃 Asignación FINAL: asegurar que NINGÚN bloque quede sin asignar
  const bloquesRestantes = bloques.filter(b => !b.profesorAsignado && !['SA09', 'SA11'].includes(b.idBloque));

  for (const bloque of bloquesRestantes) {
    for (const prof of profesores) {
      if (
        prof.bloquesDisponibles.includes(bloque.idBloque) &&
        !prof.bloquesOcupados.has(bloque.idBloque)
      ) {
        bloque.profesorAsignado = prof.nombre;
        prof.bloquesOcupados.add(bloque.idBloque);
        prof.asignados++;
        break; // ir al siguiente bloque
      }
    }
  }

  return bloques;

  // 🧠 Función de asignación genérica
  function asignarPorOrden(lista) {
    for (const prof of lista) {
      for (const bloque of prof.bloquesDisponibles) {
        if (prof.asignados >= prof.bloquesEsperados) break;
        if (prof.bloquesOcupados.has(bloque)) continue;
        if (['SA09', 'SA11'].includes(bloque)) continue;

        const taller = bloques.find(t =>
          t.idBloque === bloque &&
          !t.profesorAsignado
        );

        if (taller) {
          taller.profesorAsignado = prof.nombre;
          prof.bloquesOcupados.add(bloque);
          prof.asignados++;
        }
      }
    }
  }
}
