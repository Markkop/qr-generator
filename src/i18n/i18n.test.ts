import { describe, expect, it } from 'vitest'
import { createTranslator, DICTIONARIES } from './context'
import { interpolate, LOCALES, type MessageKey } from './messages'

const placeholders = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  it('have the same keys and placeholders in every locale', () => {
    const [base, ...rest] = LOCALES.map((l) => DICTIONARIES[l.code])
    const keys = Object.keys(base!) as MessageKey[]
    for (const dict of rest) {
      expect(Object.keys(dict).sort()).toEqual([...keys].sort())
      for (const key of keys) expect(placeholders(dict[key]), key).toEqual(placeholders(base![key]))
    }
  })

  it('has no empty strings', () => {
    for (const { code } of LOCALES)
      for (const [key, value] of Object.entries(DICTIONARIES[code])) expect(value.trim(), `${code} ${key}`).not.toBe('')
  })
})

describe('translator', () => {
  it('interpolates and formats numbers per locale', () => {
    expect(interpolate('{n} itens', { n: 1500 }, 'pt-BR')).toBe('1.500 itens')
    expect(interpolate('{n} items', { n: 1500 }, 'en')).toBe('1,500 items')
    expect(interpolate('{missing}', {}, 'en')).toBe('{missing}')
  })

  it('picks plural forms', () => {
    const pt = createTranslator('pt-BR')
    const en = createTranslator('en')
    expect(pt.tn('quiet.value', 1)).not.toBe(pt.tn('quiet.value', 2))
    expect(en.tn('quiet.value', 1)).toContain('1')
    expect(en.tn('quiet.value', 4)).toContain('4')
  })

  it('translates message objects', () => {
    expect(createTranslator('en').tm({ key: 'warn.logoEcl', params: { ecl: 'M' } })).toContain('M')
  })
})
