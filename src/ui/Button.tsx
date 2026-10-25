import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'border-transparent bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-surface text-fg border-line-strong hover:border-subtle hover:bg-surface-2',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-canvas hover:text-fg',
  dark: 'border-transparent bg-ink text-white hover:bg-ink-2',
  soft: 'border-transparent bg-primary-soft text-primary-active hover:bg-primary-soft-2',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5.5 text-[15px]',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  block?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, className, children, type = 'button', ...rest },
  ref,
) {
  const iconSize = size === 'sm' ? 16 : 18
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  )
})

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName
  label: string
  variant?: 'ghost' | 'secondary' | 'primary' | 'soft'
  size?: 'sm' | 'md'
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        size === 'sm' ? 'size-7.5' : 'size-9.5',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  )
}
