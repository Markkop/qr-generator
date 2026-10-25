import type { Message } from '../../i18n/messages'
import type { BuildResult } from './build'
import type { FieldsByType, PixKeyType } from './types'

// Banco Central's static BR Code and DICT key formats:
// https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
// https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/X_ManualOperacionaldoDICT.pdf
export function crc16(text: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function validCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false
  for (const length of [9, 10]) {
    const sum = [...value.slice(0, length)].reduce((total, digit, i) => total + Number(digit) * (length + 1 - i), 0)
    const check = ((sum * 10) % 11) % 10
    if (check !== Number(value[length])) return false
  }
  return true
}

function validCnpj(value: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^(\d)\1+$/.test(value)) return false
  // The alphanumeric CNPJ keeps the modulo-11 weights; letters use ASCII minus 48.
  for (const length of [12, 13]) {
    const sum = [...value.slice(0, length)].reduce(
      (total, char, i) => total + (char.charCodeAt(0) - 48) * (2 + ((length - 1 - i) % 8)),
      0,
    )
    const remainder = sum % 11
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(value[length])) return false
  }
  return true
}

export function normalizePixKey(type: PixKeyType, input: string): string | null {
  const raw = input.trim()
  switch (type) {
    case 'email': {
      const email = raw.toLowerCase()
      const [local = '', domain = ''] = email.split('@')
      return !local.startsWith('.') &&
        !local.endsWith('.') &&
        !local.includes('..') &&
        domain.split('.').every((label) => !label.startsWith('-') && !label.endsWith('-')) &&
        email.length <= 77 &&
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)
        ? email
        : null
    }
    case 'phone': {
      const phone = raw.replace(/[\s().-]/g, '').replace(/^00/, '+')
      return /^\+[1-9]\d{1,14}$/.test(phone) ? phone : null
    }
    case 'cpf': {
      const cpf = raw.replace(/[.\s-]/g, '')
      return validCpf(cpf) ? cpf : null
    }
    case 'cnpj': {
      const cnpj = raw.replace(/[./\s-]/g, '').toUpperCase()
      return validCnpj(cnpj) ? cnpj : null
    }
    case 'random': {
      const key = raw.toLowerCase()
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key) ? key : null
    }
    default:
      return null
  }
}

export function normalizePixAmount(input: string): string | null {
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(input.trim())) return null
  const [whole, fraction = ''] = input.trim().replace(',', '.').split('.')
  const amount = `${BigInt(whole)}.${fraction.padEnd(2, '0')}`
  return amount !== '0.00' && amount.length <= 13 ? amount : null
}

function merchantText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim()
}

function tlv(id: string, value: string): string {
  const length = new TextEncoder().encode(value).length
  if (length > 99) throw new Error('BR Code fields cannot exceed 99 bytes.')
  return `${id}${String(length).padStart(2, '0')}${value}`
}

export function buildPix(fields: FieldsByType['pix']): BuildResult {
  const errors: Record<string, Message> = {}
  const key = normalizePixKey(fields.keyType, fields.key)
  const name = merchantText(fields.name)
  const city = merchantText(fields.city)
  const txid = fields.txid.trim() || '***'
  const amount = fields.amount.trim() ? normalizePixAmount(fields.amount) : ''
  if (fields.key.trim() && !key) errors.key = { key: 'error.pixKey' }
  if (fields.name.trim() && !/^[\x20-\x7e]{1,25}$/.test(name)) errors.name = { key: 'error.pixName' }
  if (fields.city.trim() && !/^[\x20-\x7e]{1,15}$/.test(city)) errors.city = { key: 'error.pixCity' }
  if (amount === null) errors.amount = { key: 'error.pixAmount' }
  if (!/^(?:[A-Za-z0-9]{1,25}|\*\*\*)$/.test(txid)) errors.txid = { key: 'error.pixTxid' }
  if (Object.keys(errors).length || !key || !name || !city) return { payload: null, errors, warnings: [] }
  const data =
    tlv('00', '01') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', key)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount ? tlv('54', amount) : '') +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', txid)) +
    '6304'
  return { payload: data + crc16(data), errors: {}, warnings: [] }
}
