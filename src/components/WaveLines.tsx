import { useEffect, useRef, type CSSProperties } from 'react'

const GAP = 13 // расстояние между линиями, px
const TILT = 0.38 // наклон линий
const STEP = 10 // шаг точки вдоль линии, px

/**
 * Белые линии с плавной бегущей волной. Рисуется на canvas: ~100 линий × ~100 точек за кадр,
 * поэтому нагрузка небольшая; анимация сама останавливается, когда вкладка скрыта (requestAnimationFrame),
 * а при «уменьшить движение» в системе рисуется один неподвижный кадр.
 */
export function WaveLines({ className, style }: { className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let raf = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    function draw(ms: number) {
      const t = ms / 1000
      ctx!.clearRect(0, 0, w, h)
      ctx!.lineWidth = 1.3
      ctx!.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx!.beginPath()
      const count = Math.ceil((h + w * TILT) / GAP) + 6
      for (let i = 0; i < count; i++) {
        const y0 = i * GAP - w * TILT
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          // две волны разной длины и скорости, фаза зависит от номера линии — волна «течёт» поперёк линий
          const y =
            y0 + x * TILT +
            Math.sin(x * 0.008 + t * 0.55 + i * 0.16) * 16 +
            Math.sin(x * 0.019 - t * 0.35 + i * 0.07) * 6
          if (x === -STEP) ctx!.moveTo(x, y)
          else ctx!.lineTo(x, y)
        }
      }
      ctx!.stroke()
    }

    const loop = (ms: number) => {
      draw(ms)
      raf = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    if (!reduce) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={className} style={style} />
}
