import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, FileDown, LocateFixed } from 'lucide-react'
import { useI18n } from '../i18n/context'
import type { Message, MessageKey } from '../i18n/messages'
import {
  PIX_KEY_TYPES,
  type ContentType,
  type FieldsByType,
  type PixKeyType,
  type WifiEncryption,
} from '../lib/payload/types'
import {
  internationalEntry,
  normalizeCountry,
  phoneCountryOptions,
  phonePlaceholder,
  withCountry,
} from '../lib/phone-format'
import { buildCalendar } from '../lib/payload/calendar'
import { downloadBlob } from '../lib/export'
import { Button, Field, FieldActions, PasteArea, PasteInput, Segmented, Select, Switch, TextInput } from './ui'
import { useToast } from './toast-context'

interface FormProps<T extends ContentType> {
  fields: FieldsByType[T]
  errors: Record<string, Message>
  onChange: (patch: Partial<FieldsByType[T]>) => void
}

function useErrorText(errors: Record<string, Message>) {
  const { tm } = useI18n()
  return (field: string) => (errors[field] ? tm(errors[field]) : undefined)
}

function UrlForm({ fields, errors, onChange }: FormProps<'url'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <Field label={t('url.label')} error={error('url')} hint={t('url.hint')}>
      {(p) => (
        <PasteInput
          {...p}
          label={t('url.label')}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={t('url.placeholder')}
          value={fields.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      )}
    </Field>
  )
}

function TextForm({ fields, errors, onChange }: FormProps<'text'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <Field label={t('text.label')} error={error('text')}>
      {(p) => (
        <PasteArea
          {...p}
          label={t('text.label')}
          rows={5}
          placeholder={t('text.placeholder')}
          value={fields.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      )}
    </Field>
  )
}

function PasswordInput({
  value,
  onChange,
  label,
  ...rest
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="relative min-w-32 flex-1 basis-32">
        <TextInput
          {...rest}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('wifi.hidePassword') : t('wifi.showPassword')}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      <FieldActions control={inputRef} label={label} />
    </div>
  )
}

const ENCRYPTION_OPTIONS: { value: WifiEncryption; label: MessageKey }[] = [
  { value: 'WPA', label: 'wifi.wpa' },
  { value: 'WEP', label: 'wifi.wep' },
  { value: 'nopass', label: 'wifi.nopass' },
]

function WifiForm({ fields, errors, onChange }: FormProps<'wifi'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('wifi.ssid')} error={error('ssid')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('wifi.ssid')}
            autoComplete="off"
            spellCheck={false}
            value={fields.ssid}
            onChange={(e) => onChange({ ssid: e.target.value })}
          />
        )}
      </Field>
      <Segmented
        label={t('wifi.security')}
        value={fields.encryption}
        options={ENCRYPTION_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
        onChange={(encryption) => onChange({ encryption })}
      />
      {fields.encryption !== 'nopass' && (
        <Field label={t('wifi.password')} error={error('password')}>
          {(p) => (
            <PasswordInput
              {...p}
              label={t('wifi.password')}
              value={fields.password}
              onChange={(password) => onChange({ password })}
            />
          )}
        </Field>
      )}
      <Switch
        checked={fields.hidden}
        onChange={(hidden) => onChange({ hidden })}
        label={t('wifi.hidden')}
        description={t('wifi.hiddenHint')}
      />
    </div>
  )
}

function EmailForm({ fields, errors, onChange }: FormProps<'email'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('email.to')} error={error('to')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('email.to')}
            type="email"
            inputMode="email"
            placeholder={t('email.placeholder')}
            value={fields.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('email.subject')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('email.subject')}
            value={fields.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('email.body')}>
        {(p) => (
          <PasteArea
            {...p}
            label={t('email.body')}
            rows={3}
            value={fields.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

function PhoneForm({ fields, errors, onChange }: FormProps<'phone'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <Field label={t('phone.number')} error={error('number')} hint={t('phone.hint')}>
      {(p) => (
        <PasteInput
          {...p}
          label={t('phone.number')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t('phone.placeholder')}
          value={fields.number}
          onChange={(e) => onChange({ number: e.target.value })}
        />
      )}
    </Field>
  )
}

function WhatsappForm({ fields, errors, onChange }: FormProps<'whatsapp'>) {
  const { t, locale } = useI18n()
  const error = useErrorText(errors)
  const country = normalizeCountry(fields.country)
  const countries = useMemo(() => phoneCountryOptions(locale), [locale])
  useEffect(() => {
    const adopted = internationalEntry(fields.number)
    if (!adopted || (adopted.country === country && adopted.number === fields.number)) return
    onChange(adopted)
  }, [country, fields.number, onChange])
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('whatsapp.country')}>
        {(p) => (
          <Select
            {...p}
            value={country}
            onChange={(e) => onChange(withCountry(e.target.value, country, fields.number))}
          >
            {countries.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t('phone.number')} error={error('number')} hint={t('whatsapp.hint')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('phone.number')}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={phonePlaceholder(country)}
            value={fields.number}
            onChange={(e) => {
              const adopted = internationalEntry(e.target.value)
              onChange(adopted ?? { number: e.target.value })
            }}
          />
        )}
      </Field>
      <Field label={t('sms.message')}>
        {(p) => (
          <PasteArea
            {...p}
            label={t('sms.message')}
            rows={3}
            value={fields.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

function SmsForm({ fields, errors, onChange }: FormProps<'sms'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('phone.number')} error={error('number')} hint={t('phone.hint')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('phone.number')}
            type="tel"
            inputMode="tel"
            placeholder={t('phone.placeholder')}
            value={fields.number}
            onChange={(e) => onChange({ number: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('sms.message')}>
        {(p) => (
          <PasteArea
            {...p}
            label={t('sms.message')}
            rows={3}
            value={fields.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

function ContactForm({ fields, errors, onChange }: FormProps<'contact'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  const text = (key: keyof FieldsByType['contact'], extra: Record<string, unknown> = {}) => (
    <Field label={t(`contact.${key}`)} error={error(key)}>
      {(p) => (
        <PasteInput
          {...p}
          {...extra}
          label={t(`contact.${key}`)}
          value={fields[key]}
          onChange={(e) => onChange({ [key]: e.target.value })}
        />
      )}
    </Field>
  )
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {text('firstName', { autoComplete: 'off' })}
      {text('lastName', { autoComplete: 'off' })}
      {text('organization')}
      {text('title')}
      {text('phone', { type: 'tel', inputMode: 'tel' })}
      {text('email', { type: 'email', inputMode: 'email' })}
      <div className="sm:col-span-2">{text('website', { inputMode: 'url' })}</div>
      <div className="sm:col-span-2">{text('street')}</div>
      {text('city')}
      {text('region')}
      {text('postcode')}
      {text('country')}
      <Field label={t('contact.note')} className="sm:col-span-2">
        {(p) => (
          <PasteArea
            {...p}
            label={t('contact.note')}
            rows={2}
            value={fields.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

function LocationForm({ fields, errors, onChange }: FormProps<'location'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  const toast = useToast()
  const [locating, setLocating] = useState(false)
  const locate = () => {
    if (!navigator.geolocation) {
      toast(t('location.unsupported'), 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        onChange({ latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) })
      },
      (geoError) => {
        setLocating(false)
        toast(t(geoError.code === geoError.PERMISSION_DENIED ? 'location.denied' : 'location.failed'), 'error')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('location.latitude')} error={error('latitude')}>
          {(p) => (
            <PasteInput
              {...p}
              label={t('location.latitude')}
              inputMode="decimal"
              placeholder="-23.5505"
              value={fields.latitude}
              onChange={(e) => onChange({ latitude: e.target.value })}
            />
          )}
        </Field>
        <Field label={t('location.longitude')} error={error('longitude')}>
          {(p) => (
            <PasteInput
              {...p}
              label={t('location.longitude')}
              inputMode="decimal"
              placeholder="-46.6333"
              value={fields.longitude}
              onChange={(e) => onChange({ longitude: e.target.value })}
            />
          )}
        </Field>
      </div>
      <Button onClick={locate} disabled={locating} className="self-start">
        <LocateFixed className="size-4" aria-hidden />
        {locating ? t('location.locating') : t('location.useMine')}
      </Button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('location.privacy')}</p>
    </div>
  )
}

function PixForm({ fields, errors, onChange }: FormProps<'pix'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  const hints = {
    key: t('pix.keyHint'),
    name: t('pix.nameHint'),
    city: t('pix.cityHint'),
    amount: t('pix.amountHint'),
    txid: t('pix.txidHint'),
  }
  const text = (
    key: 'key' | 'name' | 'city' | 'amount' | 'txid',
    extra: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={t(`pix.${key}`)} error={error(key)} hint={hints[key]}>
      {(p) => (
        <PasteInput
          {...p}
          {...extra}
          label={t(`pix.${key}`)}
          value={fields[key]}
          onChange={(e) => onChange({ [key]: e.target.value })}
        />
      )}
    </Field>
  )
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('pix.keyType')}>
        {(p) => (
          <Select
            {...p}
            value={fields.keyType}
            onChange={(e) => onChange({ keyType: e.target.value as PixKeyType, key: '' })}
          >
            {PIX_KEY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`pix.keyType.${type}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {text('key', {
        autoComplete: 'off',
        spellCheck: false,
        placeholder: t(`pix.placeholder.${fields.keyType}`),
        inputMode:
          fields.keyType === 'email'
            ? 'email'
            : fields.keyType === 'phone'
              ? 'tel'
              : fields.keyType === 'cpf'
                ? 'numeric'
                : 'text',
      })}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {text('name', { placeholder: t('pix.namePlaceholder') })}
        {text('city', { placeholder: 'São Paulo' })}
        {text('amount', { inputMode: 'decimal', placeholder: '25,00' })}
        {text('txid', { maxLength: 25, placeholder: 'PEDIDO123' })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('pix.help')}</p>
    </div>
  )
}

function CalendarForm({ fields, errors, onChange }: FormProps<'calendar'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  const [zones] = useState(() => {
    try {
      return [...new Set([fields.timeZone, 'UTC', ...Intl.supportedValuesOf('timeZone')])].sort()
    } catch {
      return [...new Set([fields.timeZone, 'UTC'])]
    }
  })
  const payload = buildCalendar(fields).payload
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('calendar.title')} error={error('title')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('calendar.title')}
            value={fields.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('calendar.titlePlaceholder')}
          />
        )}
      </Field>
      <Switch
        checked={fields.allDay}
        onChange={(allDay) =>
          onChange({
            allDay,
            start: fields.start ? fields.start.slice(0, 10) + (allDay ? '' : 'T09:00') : '',
            end: fields.end ? fields.end.slice(0, 10) + (allDay ? '' : 'T10:00') : '',
          })
        }
        label={t('calendar.allDay')}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(['start', 'end'] as const).map((key) => (
          <Field key={key} label={t(fields.allDay ? `calendar.${key}Date` : `calendar.${key}`)} error={error(key)}>
            {(p) => (
              <PasteInput
                {...p}
                label={t(fields.allDay ? `calendar.${key}Date` : `calendar.${key}`)}
                type={fields.allDay ? 'date' : 'datetime-local'}
                className="basis-full"
                value={fields[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>
      {!fields.allDay && (
        <Field label={t('calendar.timeZone')} error={error('timeZone')} hint={t('calendar.zoneHint')}>
          {(p) => (
            <Select {...p} value={fields.timeZone} onChange={(e) => onChange({ timeZone: e.target.value })}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label={t('calendar.location')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('calendar.location')}
            value={fields.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('calendar.description')}>
        {(p) => (
          <PasteArea
            {...p}
            label={t('calendar.description')}
            value={fields.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!payload}
          onClick={() => {
            if (payload) downloadBlob(new Blob([payload], { type: 'text/calendar;charset=utf-8' }), 'evento.ics')
          }}
        >
          <FileDown className="size-4" aria-hidden />
          {t('calendar.download')}
        </Button>
        <p className="min-w-40 flex-1 text-xs text-zinc-500 dark:text-zinc-400">{t('calendar.help')}</p>
      </div>
    </div>
  )
}

function TelegramForm({ fields, errors, onChange }: FormProps<'telegram'>) {
  const { t } = useI18n()
  const error = useErrorText(errors)
  return (
    <div className="flex flex-col gap-4">
      <Field label={t('telegram.username')} error={error('username')} hint={t('telegram.hint')}>
        {(p) => (
          <PasteInput
            {...p}
            label={t('telegram.username')}
            placeholder="@usuario"
            autoComplete="off"
            spellCheck={false}
            value={fields.username}
            onChange={(e) => onChange({ username: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('sms.message')} error={error('message')} hint={t('telegram.messageHint')}>
        {(p) => (
          <PasteArea
            {...p}
            label={t('sms.message')}
            rows={3}
            value={fields.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
        )}
      </Field>
    </div>
  )
}

const FORMS: { [T in ContentType]: (props: FormProps<T>) => React.JSX.Element } = {
  url: UrlForm,
  text: TextForm,
  wifi: WifiForm,
  email: EmailForm,
  phone: PhoneForm,
  whatsapp: WhatsappForm,
  sms: SmsForm,
  contact: ContactForm,
  location: LocationForm,
  pix: PixForm,
  calendar: CalendarForm,
  telegram: TelegramForm,
}

export function ContentForm<T extends ContentType>({ type, ...props }: FormProps<T> & { type: T }) {
  const Form = FORMS[type] as (props: FormProps<T>) => React.JSX.Element
  return <Form {...props} />
}
