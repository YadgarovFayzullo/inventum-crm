/** Обрезает фото до квадрата, уменьшает до size×size и сжимает (WebP, при отсутствии поддержки — JPEG). Исходник на сервер не уходит. */
export async function prepareAvatar(file: File, size = 512): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(file.type) && !file.type.startsWith('image/')) throw new Error('Выберите изображение')
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bmp.width, bmp.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(size, side)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q))
  const blob = (await toBlob('image/webp', 0.85)) ?? (await toBlob('image/jpeg', 0.88))
  if (!blob || !/^image\/(webp|jpeg|png)$/.test(blob.type)) throw new Error('Не удалось обработать фото')
  return blob
}
