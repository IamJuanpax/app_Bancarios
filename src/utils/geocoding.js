/**
 * ============================================================
 * GEOCODING – Conversión de dirección a coordenadas GPS
 * ============================================================
 * 
 * Utiliza Nominatim (OpenStreetMap) para geocodificación.
 * 
 * ¿Por qué Nominatim?
 * - Costo $0 (gratuito, sin API key)
 * - Suficiente precisión para direcciones en Argentina
 * - Cumple con la estrategia de costos del proyecto (CONTEXT.md §2)
 * 
 * Política de uso de Nominatim:
 * - Máximo 1 request por segundo
 * - Incluir User-Agent identificatorio
 * - No usar en batch masivo
 * 
 * Para nuestro caso (cargar pacientes de a uno) es perfecto.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Geocodifica una dirección (string) a coordenadas GPS.
 * Agrega ", Argentina" al final para mejorar la precisión
 * en direcciones de Buenos Aires / Argentina.
 * 
 * @param {string} direccion - Dirección como string (ej: "Av. Corrientes 1234, CABA")
 * @returns {Promise<{ lat: number, lng: number } | null>} Coordenadas o null si no se encontró
 * 
 * @example
 * const coords = await geocodeAddress('Av. Corrientes 1234, CABA');
 * // { lat: -34.6040, lng: -58.3850 }
 */
export const geocodeAddress = async (direccion) => {
    if (!direccion || !direccion.trim()) return null;

    try {
        // Agregar ", Argentina" si no la incluye, para mejorar precisión
        let query = direccion.trim();
        if (!query.toLowerCase().includes('argentina')) {
            query += ', Argentina';
        }

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'ar',  // Priorizar Argentina
        });

        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
            headers: {
                'User-Agent': 'RehabMobile/1.0 (app-medica)',
                'Accept-Language': 'es',
            },
        });

        if (!response.ok) {
            console.warn('Geocoding: respuesta no OK:', response.status);
            return null;
        }

        const results = await response.json();

        if (results && results.length > 0) {
            const { lat, lon } = results[0];
            return {
                lat: parseFloat(lat),
                lng: parseFloat(lon),
            };
        }

        return null;
    } catch (error) {
        console.error('Error en geocoding:', error);
        return null;
    }
};

/**
 * Geocodifica y devuelve también el nombre formateado de la ubicación
 * que Nominatim encontró (para verificación visual).
 * 
 * @param {string} direccion - Dirección a buscar
 * @returns {Promise<{ lat: number, lng: number, displayName: string } | null>}
 */
export const geocodeAddressVerbose = async (direccion) => {
    if (!direccion || !direccion.trim()) return null;

    try {
        let query = direccion.trim();
        if (!query.toLowerCase().includes('argentina')) {
            query += ', Argentina';
        }

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'ar',
        });

        const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
            headers: {
                'User-Agent': 'RehabMobile/1.0 (app-medica)',
                'Accept-Language': 'es',
            },
        });

        if (!response.ok) return null;

        const results = await response.json();

        if (results && results.length > 0) {
            const { lat, lon, display_name } = results[0];
            return {
                lat: parseFloat(lat),
                lng: parseFloat(lon),
                displayName: display_name,
            };
        }

        return null;
    } catch (error) {
        console.error('Error en geocoding verbose:', error);
        return null;
    }
};
