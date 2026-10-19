import { describe, expect, it } from 'vitest'

import { distanceKm, shortAddress } from './geo'

describe('places', () => {
  it('the distance between two points of Kharkiv, in kilometres', () => {
    // the Freedom Square and the Saltivka metro station: about 7.5 km
    const km = distanceKm({ lat: 50.0056, lng: 36.2316 }, { lat: 50.0303, lng: 36.3321 })
    expect(km).toBeGreaterThan(7)
    expect(km).toBeLessThan(8)
    expect(distanceKm({ lat: 50, lng: 36 }, { lat: 50, lng: 36 })).toBe(0)
  })

  it('a short address: the street, the house and the city', () => {
    expect(
      shortAddress({
        display_name: 'Сумська вулиця, 1, Центр, Харків, Україна',
        address: { road: 'Сумська вулиця', house_number: '1', city: 'Харків' }
      })
    ).toBe('Сумська вулиця, 1, Харків')
    expect(shortAddress({ display_name: 'Салтівка, Харків' })).toBe('Салтівка, Харків')
  })
})
