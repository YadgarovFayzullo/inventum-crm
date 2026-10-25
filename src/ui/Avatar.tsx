import { memo, useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'

const tones = {
  soft: 'bg-primary-soft text-primary-active',
  dark: 'bg-ink text-white',
  orange: 'bg-primary text-white',
}

// Фон аватаров — только мягкие оттенки бренда
const BACKGROUNDS = ['ffe1cd', 'fff1e8', 'f5f5f4']

/*
  Стиль DiceBear весит ~400 КБ, поэтому грузится отдельным чанком после первого рендера:
  до загрузки показываются инициалы, затем все аватары разом подменяются.
*/
type Generator = (seed: string) => string
let generate: Generator | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function load() {
  loading ??= Promise.all([import('@dicebear/core'), import('@dicebear/notionists')]).then(([core, style]) => {
    generate = (seed) => core.createAvatar(style, { seed, backgroundColor: BACKGROUNDS, backgroundType: ['solid'] }).toDataUri()
    listeners.forEach((l) => l())
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  load()
  return () => listeners.delete(l)
}
const getReady = () => generate !== null

// SVG генерируется один раз на seed и переиспользуется во всех списках
const cache = new Map<string, string>()
function avatarUri(seed: string) {
  let uri = cache.get(seed)
  if (!uri) {
    uri = generate!(seed)
    cache.set(seed, uri)
  }
  return uri
}

type AvatarProps = {
  name: string
  size?: number
  tone?: keyof typeof tones
  /** Если задан — рисуется аватар DiceBear (для учеников передавайте id, чтобы он не менялся при смене имени) */
  seed?: string
}

export const Avatar = memo(function Avatar({ name, size = 36, tone = 'soft', seed }: AvatarProps) {
  const ready = useSyncExternalStore(subscribe, getReady)
  if (seed && ready) {
    return (
      <img
        src={avatarUri(seed)}
        alt={name}
        width={size}
        height={size}
        decoding="async"
        className="shrink-0 rounded-full bg-primary-soft"
        style={{ width: size, height: size }}
      />
    )
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-wide', tones[tone])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
})
