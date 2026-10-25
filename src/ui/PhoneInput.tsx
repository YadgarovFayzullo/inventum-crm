import { Input } from './Field'
import { formatPhone } from '@/lib/format'

type PhoneInputProps = {
  label?: string
  value: string
  onChange: (digits: string) => void
  error?: string
  required?: boolean
  autoFocus?: boolean
}

/** Хранит только 9 цифр номера (без +998), показывает маску +998 XX XXX XX XX */
export function PhoneInput({ label, value, onChange, error, required, autoFocus }: PhoneInputProps) {
  return (
    <Input
      label={label}
      icon="phone"
      inputMode="tel"
      placeholder="+998 90 123 45 67"
      value={value ? formatPhone(value) : ''}
      onChange={(e) => {
        let d = e.target.value.replace(/\D/g, '')
        if (d.startsWith('998')) d = d.slice(3)
        onChange(d.slice(0, 9))
      }}
      error={error}
      required={required}
      autoFocus={autoFocus}
    />
  )
}
