import { useState } from 'react'
import { Eye, EyeOff, LocateFixed } from 'lucide-react'
import type { ContentType, FieldsByType, WifiEncryption } from '../lib/payload/types'
import { Button, Field, Segmented, Switch, TextArea, TextInput } from './ui'
import { useToast } from './toast-context'

interface FormProps<T extends ContentType> {
  fields: FieldsByType[T]
  errors: Record<string, string>
  onChange: (patch: Partial<FieldsByType[T]>) => void
}

function UrlForm({ fields, errors, onChange }: FormProps<'url'>) {
  return (
    <Field label="Website URL" error={errors.url} hint="https:// is added automatically if you leave it out.">
      {(p) => (
        <TextInput
          {...p}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="example.com"
          value={fields.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      )}
    </Field>
  )
}

function TextForm({ fields, errors, onChange }: FormProps<'text'>) {
  return (
    <Field label="Text" error={errors.text}>
      {(p) => (
        <TextArea
          {...p}
          rows={5}
          placeholder="Anything you want people to read after scanning"
          value={fields.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      )}
    </Field>
  )
}

function PasswordInput(
  props: { id: string; value: string; onChange: (value: string) => void } & Record<string, unknown>,
) {
  const { value, onChange, ...rest } = props
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <TextInput
        {...rest}
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
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

const ENCRYPTION_OPTIONS: { value: WifiEncryption; label: string }[] = [
  { value: 'WPA', label: 'WPA/WPA2/WPA3' },
  { value: 'WEP', label: 'WEP' },
  { value: 'nopass', label: 'No password' },
]

function WifiForm({ fields, errors, onChange }: FormProps<'wifi'>) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Network name (SSID)" error={errors.ssid}>
        {(p) => (
          <TextInput
            {...p}
            autoComplete="off"
            spellCheck={false}
            value={fields.ssid}
            onChange={(e) => onChange({ ssid: e.target.value })}
          />
        )}
      </Field>
      <Segmented
        label="Security"
        value={fields.encryption}
        options={ENCRYPTION_OPTIONS}
        onChange={(encryption) => onChange({ encryption })}
      />
      {fields.encryption !== 'nopass' && (
        <Field label="Password" error={errors.password}>
          {(p) => <PasswordInput {...p} value={fields.password} onChange={(password) => onChange({ password })} />}
        </Field>
      )}
      <Switch
        checked={fields.hidden}
        onChange={(hidden) => onChange({ hidden })}
        label="Hidden network"
        description="Turn on if the network does not broadcast its name."
      />
    </div>
  )
}

function EmailForm({ fields, errors, onChange }: FormProps<'email'>) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Email address" error={errors.to}>
        {(p) => (
          <TextInput
            {...p}
            type="email"
            inputMode="email"
            placeholder="name@example.com"
            value={fields.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        )}
      </Field>
      <Field label="Subject (optional)">
        {(p) => <TextInput {...p} value={fields.subject} onChange={(e) => onChange({ subject: e.target.value })} />}
      </Field>
      <Field label="Message (optional)">
        {(p) => <TextArea {...p} rows={3} value={fields.body} onChange={(e) => onChange({ body: e.target.value })} />}
      </Field>
    </div>
  )
}

function PhoneForm({ fields, errors, onChange }: FormProps<'phone'>) {
  return (
    <Field label="Phone number" error={errors.number} hint="Include the country code, like +1 555 123 4567.">
      {(p) => (
        <TextInput
          {...p}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 555 123 4567"
          value={fields.number}
          onChange={(e) => onChange({ number: e.target.value })}
        />
      )}
    </Field>
  )
}

function SmsForm({ fields, errors, onChange }: FormProps<'sms'>) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Phone number" error={errors.number} hint="Include the country code, like +1 555 123 4567.">
        {(p) => (
          <TextInput
            {...p}
            type="tel"
            inputMode="tel"
            placeholder="+1 555 123 4567"
            value={fields.number}
            onChange={(e) => onChange({ number: e.target.value })}
          />
        )}
      </Field>
      <Field label="Message (optional)">
        {(p) => (
          <TextArea {...p} rows={3} value={fields.message} onChange={(e) => onChange({ message: e.target.value })} />
        )}
      </Field>
    </div>
  )
}

function ContactForm({ fields, errors, onChange }: FormProps<'contact'>) {
  const text = (key: keyof FieldsByType['contact'], label: string, extra: Record<string, unknown> = {}) => (
    <Field label={label} error={errors[key]}>
      {(p) => <TextInput {...p} {...extra} value={fields[key]} onChange={(e) => onChange({ [key]: e.target.value })} />}
    </Field>
  )
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {text('firstName', 'First name', { autoComplete: 'off' })}
      {text('lastName', 'Last name', { autoComplete: 'off' })}
      {text('organization', 'Company')}
      {text('title', 'Job title')}
      {text('phone', 'Phone', { type: 'tel', inputMode: 'tel' })}
      {text('email', 'Email', { type: 'email', inputMode: 'email' })}
      <div className="sm:col-span-2">{text('website', 'Website', { inputMode: 'url' })}</div>
      <div className="sm:col-span-2">{text('street', 'Street')}</div>
      {text('city', 'City')}
      {text('region', 'State / region')}
      {text('postcode', 'Postal code')}
      {text('country', 'Country')}
      <Field label="Note" className="sm:col-span-2">
        {(p) => <TextArea {...p} rows={2} value={fields.note} onChange={(e) => onChange({ note: e.target.value })} />}
      </Field>
    </div>
  )
}

function LocationForm({ fields, errors, onChange }: FormProps<'location'>) {
  const toast = useToast()
  const [locating, setLocating] = useState(false)
  const locate = () => {
    if (!navigator.geolocation) {
      toast('Your browser does not support location.', 'error')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        onChange({ latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) })
      },
      (error) => {
        setLocating(false)
        toast(
          error.code === error.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not get your location.',
          'error',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Latitude" error={errors.latitude}>
          {(p) => (
            <TextInput
              {...p}
              inputMode="decimal"
              placeholder="-23.5505"
              value={fields.latitude}
              onChange={(e) => onChange({ latitude: e.target.value })}
            />
          )}
        </Field>
        <Field label="Longitude" error={errors.longitude}>
          {(p) => (
            <TextInput
              {...p}
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
        {locating ? 'Locating...' : 'Use my current location'}
      </Button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Your location is only used to fill these fields. It never leaves your device.
      </p>
    </div>
  )
}

const FORMS: { [T in ContentType]: (props: FormProps<T>) => React.JSX.Element } = {
  url: UrlForm,
  text: TextForm,
  wifi: WifiForm,
  email: EmailForm,
  phone: PhoneForm,
  sms: SmsForm,
  contact: ContactForm,
  location: LocationForm,
}

export function ContentForm<T extends ContentType>({ type, ...props }: FormProps<T> & { type: T }) {
  const Form = FORMS[type] as (props: FormProps<T>) => React.JSX.Element
  return <Form {...props} />
}
