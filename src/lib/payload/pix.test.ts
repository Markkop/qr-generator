import { describe, expect, it } from 'vitest'
import { buildPayload } from './build'
import { crc16, normalizePixAmount, normalizePixKey } from './pix'
import { DEFAULT_FIELDS, type PixKeyType } from './types'

const pix = {
  ...DEFAULT_FIELDS.pix,
  keyType: 'random' as const,
  key: '123e4567-e12b-12d1-a456-426655440000',
  name: 'Fulano de Tal',
  city: 'BRASILIA',
}

describe('static Pix BR Code', () => {
  it('matches the Banco Central sample, including CRC', () => {
    expect(buildPayload('pix', pix).payload).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    )
    expect(crc16('123456789')).toBe('29B1')
  })
  it.each([
    ['email', ' Ana@Example.com ', 'ana@example.com'],
    ['phone', '+55 (11) 91234-5678', '+5511912345678'],
    ['cpf', '529.982.247-25', '52998224725'],
    ['cnpj', '11.222.333/0001-81', '11222333000181'],
    ['cnpj', '12.ABC.345/01DE-35', '12ABC34501DE35'],
    ['random', pix.key.toUpperCase(), pix.key],
  ] as const)('normalizes %s keys', (type, input, expected) => expect(normalizePixKey(type, input)).toBe(expected))
  it.each([
    ['email', 'a..b@example.com'],
    ['email', '.a@example.com'],
    ['email', 'a@-example.com'],
    ['phone', '11912345678'],
    ['cpf', '11111111111'],
    ['cpf', '52998224726'],
    ['cnpj', '11222333000182'],
    ['random', 'not-a-uuid'],
    ['invalid', 'value'],
  ])('rejects malformed %s keys', (type, input) => expect(normalizePixKey(type as PixKeyType, input)).toBeNull())
  it.each([
    ['25,5', '25.50'],
    ['0001', '1.00'],
    ['0.01', '0.01'],
    ['9999999999.99', '9999999999.99'],
  ])('normalizes exact decimal amount %s', (input, expected) => expect(normalizePixAmount(input)).toBe(expected))
  it.each(['0', '-1', '1.001', '1.234,56', '1e3', '10000000000'])('rejects invalid amount %s', (input) =>
    expect(normalizePixAmount(input)).toBeNull(),
  )
  it('encodes amount, reference, and normalized merchant text', () => {
    const payload = buildPayload('pix', {
      ...pix,
      name: 'José Silva',
      city: 'São Paulo',
      amount: '25,50',
      txid: 'PEDIDO123',
    }).payload!
    expect(payload).toContain('540525.50')
    expect(payload).toContain('5910Jose Silva6009Sao Paulo')
    expect(payload).toContain('62130509PEDIDO123')
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)))
  })
  it('keeps incomplete forms empty and refuses invalid merchant fields', () => {
    expect(buildPayload('pix', DEFAULT_FIELDS.pix).payload).toBeNull()
    expect(buildPayload('pix', { ...pix, name: 'x'.repeat(26) }).errors.name.key).toBe('error.pixName')
    expect(buildPayload('pix', { ...pix, city: 'x'.repeat(16) }).payload).toBeNull()
    expect(buildPayload('pix', { ...pix, txid: 'order 123' }).payload).toBeNull()
  })
})
