/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of the first point in decimal degrees
 * @param {number} lon1 - Longitude of the first point in decimal degrees
 * @param {number} lat2 - Latitude of the second point in decimal degrees
 * @param {number} lon2 - Longitude of the second point in decimal degrees
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const p1 = lat1 * Math.PI / 180; // φ, λ en radianes
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in metros
  return distance;
};

/**
 * Validates if the distance between two points is within the allowed radius.
 * @param {number} currentLat - Current latitude
 * @param {number} currentLon - Current longitude
 * @param {number} targetLat - Target latitude (Patient location)
 * @param {number} targetLon - Target longitude (Patient location)
 * @param {number} maxDistance - Maximum allowed distance in meters (default 400)
 * @returns {boolean} True if within range, false otherwise
 */
export const isWithinRange = (currentLat, currentLon, targetLat, targetLon, maxDistance = 400) => {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= maxDistance;
};
