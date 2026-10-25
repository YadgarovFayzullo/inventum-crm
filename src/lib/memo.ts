/** Мемоизация по ссылкам аргументов: пересчёт только когда изменился один из срезов стора */
export function memoRefs<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | null = null
  let lastResult: R
  return (...args: A) => {
    if (lastArgs && args.length === lastArgs.length && args.every((a, i) => a === lastArgs![i])) return lastResult
    lastArgs = args
    lastResult = fn(...args)
    return lastResult
  }
}
