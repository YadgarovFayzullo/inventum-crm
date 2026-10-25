import { useLayoutEffect, useRef, useState } from 'react'
import { Input } from './Field'

type MoneyInputProps = {
  label?: string
  value: number
  onChange: (value: number) => void
  hint?: string
  error?: string
  placeholder?: string
  suffix?: string
  autoFocus?: boolean
  className?: string
}

/** 45000 → «45 000». Хранит число, пробелы расставляет сам и не сбивает позицию курсора. */
const format = (n: number) => (n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '')

export function MoneyInput({ value, onChange, suffix = 'сум', placeholder = '0', ...rest }: MoneyInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  // сколько цифр было слева от курсора — по нему восстанавливаем позицию после форматирования
  const [caretDigits, setCaretDigits] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (caretDigits === null || !ref.current) return
    const text = ref.current.value
    let seen = 0
    let pos = text.length
    if (caretDigits === 0) pos = 0
    else
      for (let i = 0; i < text.length; i++) {
        if (/\d/.test(text[i]!) && ++seen === caretDigits) {
          pos = i + 1
          break
        }
      }
    ref.current.setSelectionRange(pos, pos)
    setCaretDigits(null)
  }, [caretDigits, value])

  return (
    <Input
      {...rest}
      ref={ref}
      inputMode="numeric"
      placeholder={placeholder}
      suffix={suffix}
      value={format(value)}
      onChange={(e) => {
        const el = e.target
        const digitsBefore = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length
        const n = Number(el.value.replace(/\D/g, '').slice(0, 12))
        setCaretDigits(digitsBefore)
        onChange(n)
      }}
    />
  )
}
