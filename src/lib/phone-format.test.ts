import { describe, expect, it } from 'vitest'
import {
  detectPhoneCountry,
  internationalEntry,
  phoneCountryOptions,
  phonePlaceholder,
  resolveWhatsapp,
  withCountry,
} from './phone-format'

describe('phone countries', () => {
  it('uses the first known region and falls back to Brazil', () => {
    expect(detectPhoneCountry(['pt-BR', 'en-US'])).toBe('BR')
    expect(detectPhoneCountry(['en-US', 'en'])).toBe('US')
    expect(detectPhoneCountry(['en', 'fr'])).toBe('BR')
    expect(detectPhoneCountry([])).toBe('BR')
    expect(detectPhoneCountry(['not-a-locale', 'pt-PT'])).toBe('PT')
  })

  it('lists every country with its calling code, in the interface language', () => {
    const options = phoneCountryOptions('pt-BR')
    expect(options.some(({ code }) => code === 'BR')).toBe(true)
    expect(options.find(({ code }) => code === 'BR')?.label).toContain('(+55)')
    expect(options.find(({ code }) => code === 'US')?.label).toContain('(+1)')
    const names = options.map(({ label }) => label.replace(/^[^\p{L}]+/u, '').replace(/ \(.*\)$/, ''))
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')))
  })
})

describe('resolveWhatsapp', () => {
  it('formats a Brazilian mobile and prefixes +55', () => {
    expect(resolveWhatsapp('BR', '11996792211')).toEqual({
      country: 'BR',
      digits: '5511996792211',
      display: '(11) 99679-2211',
    })
    expect(resolveWhatsapp('BR', '(11) 99679-2211')?.digits).toBe('5511996792211')
    expect(resolveWhatsapp('BR', '5511996792211')?.digits).toBe('5511996792211')
  })

  it('lets the selected country replace the calling code of a national number', () => {
    expect(resolveWhatsapp('US', '2025550123')).toMatchObject({ digits: '12025550123', display: '(202) 555-0123' })
    expect(resolveWhatsapp('US', '11996792211')?.digits).toBe('111996792211')
    expect(resolveWhatsapp('PT', '912345678')).toMatchObject({ digits: '351912345678', display: '912 345 678' })
    expect(resolveWhatsapp('DE', '15123456789')?.digits).toBe('4915123456789')
  })

  it('keeps a real area code that matches the country calling code', () => {
    expect(resolveWhatsapp('BR', '55912345678')).toEqual({
      country: 'BR',
      digits: '5555912345678',
      display: '(55) 91234-5678',
    })
  })

  it('drops a trunk prefix and follows a pasted international number', () => {
    expect(resolveWhatsapp('GB', '07911 123456')?.digits).toBe('447911123456')
    expect(resolveWhatsapp('BR', '+1 202 555 0123')).toMatchObject({
      country: 'US',
      digits: '12025550123',
      display: '(202) 555-0123',
    })
    expect(resolveWhatsapp('US', '0055 11 99679 2211')?.digits).toBe('5511996792211')
    expect(resolveWhatsapp('BR', '+55 11')).toBeNull()
    expect(resolveWhatsapp('BR', '')).toBeNull()
  })

  it('rewrites a pasted number into the matching country and reformats when the country changes', () => {
    expect(internationalEntry('+44 20 7946 0958')).toEqual({ country: 'GB', number: '020 7946 0958' })
    expect(internationalEntry('11996792211')).toBeNull()
    expect(withCountry('US', 'BR', '(11) 99679-2211')).toMatchObject({ country: 'US', number: '11996792211' })
    expect(phonePlaceholder('BR')).toBe('(11) 96123-4567')
  })
})
