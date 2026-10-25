import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './icons'

type FieldProps = { label?: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string; className?: string }

export function Field({ label, hint, error, children, htmlFor, className }: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && <label className="text-[13px] font-medium text-muted" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="text-xs text-primary-active">{error}</span> : hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </div>
  )
}

const control = (invalid?: string) =>
  cn(
    'relative flex h-10.5 items-center gap-2 rounded-xl border bg-surface px-3.5 transition-[border-color,box-shadow]',
    'border-line-strong hover:border-subtle focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft',
    invalid && 'border-primary',
  )
const bare = 'h-full min-w-0 flex-1 border-0 bg-transparent p-0 outline-none placeholder:text-subtle focus-visible:outline-none'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  icon?: IconName
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <div className={control(error)}>
        {icon && <Icon name={icon} size={18} className="shrink-0 text-subtle" />}
        <input ref={ref} id={inputId} className={bare} {...rest} />
        {suffix && <span className="shrink-0 text-[13px] text-subtle">{suffix}</span>}
      </div>
    </Field>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }

export function Textarea({ label, hint, error, className, id, ...rest }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      <div className={cn(control(error), 'h-auto py-2.5')}>
        <textarea id={inputId} rows={3} className={cn(bare, 'min-h-16 resize-y leading-normal')} {...rest} />
      </div>
    </Field>
  )
}
