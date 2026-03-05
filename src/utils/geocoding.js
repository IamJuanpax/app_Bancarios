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

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

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

        const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
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

        const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
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

/**
 * Reverse geocoding: convierte coordenadas GPS a una dirección legible.
 * Útil para el botón "Usar ubicación actual" en el formulario de pacientes.
 * 
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Promise<{ direccion: string, direccionCompleta: string } | null>}
 * 
 * @example
 * const result = await reverseGeocode(-34.6037, -58.3816);
 * // { direccion: 'Av. 9 de Julio 1100, San Nicolás, CABA', direccionCompleta: '...' }
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
            addressdetails: '1',
            zoom: '18',
        });

        const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
            headers: {
                'User-Agent': 'RehabMobile/1.0 (app-medica)',
                'Accept-Language': 'es',
            },
        });

        if (!response.ok) return null;

        const result = await response.json();

        if (result && result.address) {
            const addr = result.address;
            // Construir dirección legible: "Calle Número, Barrio, Ciudad"
            const parts = [];
            if (addr.road) {
                parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
            }
            if (addr.suburb || addr.neighbourhood) {
                parts.push(addr.suburb || addr.neighbourhood);
            }
            if (addr.city || addr.town || addr.village) {
                parts.push(addr.city || addr.town || addr.village);
            }

            return {
                direccion: parts.join(', ') || result.display_name,
                direccionCompleta: result.display_name,
            };
        }

        return null;
    } catch (error) {
        console.error('Error en reverse geocoding:', error);
        return null;
    }
};

