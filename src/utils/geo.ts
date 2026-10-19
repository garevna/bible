/**
 * Places, free and without keys: the addresses are found by Nominatim (OpenStreetMap), Kharkiv first.
 */

/** Kharkiv: where the maps start, and what the search prefers */
export const KHARKIV = { lng: 36.2304, lat: 49.9935 }

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export interface FoundPlace {
  key: string
  title: string
  lat: number
  lng: number
}

/** "вулиця Сумська, 1, Харків" of an answer of Nominatim, or all its words */
export function shortAddress(item: { display_name: string; address?: Record<string, string> }) {
  const parts = item.address ?? {}
  const street = [parts.road ?? parts.pedestrian ?? parts.square, parts.house_number]
    .filter(Boolean)
    .join(', ')
  const city = parts.city ?? parts.town ?? parts.village
  return street && city ? `${street}, ${city}` : item.display_name
}

/** the places of some words: an address, a street, a district */
export async function findPlaces(words: string, limit = 6): Promise<FoundPlace[]> {
  const answer = await fetch(
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=${limit}&accept-language=uk` +
      `&viewbox=${KHARKIV.lng - 0.4},${KHARKIV.lat + 0.2},${KHARKIV.lng + 0.4},${KHARKIV.lat - 0.2}` +
      `&q=${encodeURIComponent(words)}`
  )
  const items = (await answer.json()) as {
    place_id: number
    display_name: string
    lat: string
    lon: string
    address?: Record<string, string>
  }[]
  return items.map((item) => ({
    key: String(item.place_id),
    title: shortAddress(item),
    lat: Number(item.lat),
    lng: Number(item.lon)
  }))
}

/** kilometres between two points, on the sphere */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
