/**
 * ============================================================
 * HAVERSINE – Cálculo de distancia geográfica
 * ============================================================
 * 
 * Core Feature de la app (CONTEXT.md §3, FR3).
 * 
 * Implementa la fórmula de Haversine para calcular la distancia
 * del gran círculo entre dos puntos sobre la superficie terrestre.
 * 
 * ¿Por qué Haversine y no una API?
 * - Costo $0 (no consume Google Distance Matrix API)
 * - Respuesta inmediata (cálculo local en el dispositivo)
 * - Bajo consumo de batería
 * - Precisión suficiente para distancias cortas (<10km)
 * 
 * Fórmula:
 *   a = sin²(Δφ/2) + cos(φ1) · cos(φ2) · sin²(Δλ/2)
 *   c = 2 · atan2(√a, √(1−a))
 *   d = R · c
 * 
 * Donde:
 *   φ = latitud en radianes
 *   λ = longitud en radianes
 *   R = radio de la Tierra (6,371 km)
 */

/**
 * Calcula la distancia entre dos puntos geográficos usando Haversine.
 *
 * @param {number} lat1 - Latitud del punto A (grados decimales)
 * @param {number} lon1 - Longitud del punto A (grados decimales)
 * @param {number} lat2 - Latitud del punto B (grados decimales)
 * @param {number} lon2 - Longitud del punto B (grados decimales)
 * @returns {number} Distancia en metros entre los dos puntos
 * 
 * @example
 * // Distancia entre dos puntos en Buenos Aires
 * const dist = calculateDistance(-34.6037, -58.3816, -34.6080, -58.3700);
 * console.log(dist); // ~1200 metros aprox
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros (6,371 km)

  // Convertir grados decimales a radianes
  const p1 = lat1 * Math.PI / 180; // φ1
  const p2 = lat2 * Math.PI / 180; // φ2
  const dp = (lat2 - lat1) * Math.PI / 180; // Δφ (diferencia de latitud)
  const dl = (lon2 - lon1) * Math.PI / 180; // Δλ (diferencia de longitud)

  // Fórmula de Haversine
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distancia en metros
  return distance;
};

/**
 * Valida si la distancia entre el médico y el paciente está
 * dentro del rango permitido (por defecto 400 metros).
 * 
 * Esta es la restricción core de la app (FR3, CONTEXT.md):
 * "Bloqueo automático si distancia > 400 metros"
 * 
 * Se usa para:
 * - Permitir/bloquear el registro de entradas en la historia clínica
 * - Mostrar badge verde (en rango) o rojo (fuera de rango) en las cards
 * 
 * @param {number} currentLat - Latitud actual del médico
 * @param {number} currentLon - Longitud actual del médico
 * @param {number} targetLat  - Latitud del paciente
 * @param {number} targetLon  - Longitud del paciente
 * @param {number} maxDistance - Distancia máxima en metros (default: 400)
 * @returns {boolean} true si está dentro del rango, false si no
 * 
 * @example
 * const canLog = isWithinRange(-34.60, -58.38, -34.601, -58.381);
 * if (canLog) {
 *   // Permitir agregar entrada de historia clínica
 * } else {
 *   // Mostrar alerta: "Fuera de rango"
 * }
 */
export const isWithinRange = (currentLat, currentLon, targetLat, targetLon, maxDistance = 400) => {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= maxDistance;
};

/**
 * Formatea una distancia en metros a un string legible.
 * Si la distancia es menor a 1km muestra metros, sino kilómetros.
 * 
 * @param {number} distanceMeters - Distancia en metros
 * @returns {string} Distancia formateada (ej: "350m" o "2.1km")
 */
export const formatDistance = (distanceMeters) => {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
};
