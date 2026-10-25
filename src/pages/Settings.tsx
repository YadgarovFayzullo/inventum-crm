import { useRef, useState, type ChangeEvent } from 'react'
import { today } from '@/lib/dates'
import { useStore, type Data } from '@/store/store'
import { Button, Card, CardHeader, ConfirmDialog, Input, PageHeader, toast } from '@/ui'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const { updateSettings, resetDemo, clearAll } = useStore.getState()
  const [name, setName] = useState(settings.centerName)
  const [confirm, setConfirm] = useState<'demo' | 'clear' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const { students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings } = useStore.getState()
    const data: Data = { students, courses, teachers, groups, enrollments, transfers, attendance, payments, leads, settings }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `inventum-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as Data
      if (!Array.isArray(data.students) || !Array.isArray(data.groups)) throw new Error('bad file')
      useStore.setState(data)
      toast('Данные восстановлены')
    } catch {
      toast('Не удалось прочитать файл', 'error')
    }
    e.target.value = ''
  }

  return (
    <>
      <PageHeader title="Настройки" />
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader title="Учебный центр" />
          <div className="flex flex-wrap items-end gap-3">
            <Input className="min-w-60 flex-1" label="Название" value={name} onChange={(e) => setName(e.target.value)} />
            <Button disabled={!name.trim() || name === settings.centerName} onClick={() => { updateSettings({ centerName: name.trim() }); toast('Сохранено') }}>Сохранить</Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Резервная копия" subtitle="Данные хранятся в браузере. Регулярно скачивайте копию." />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="download" onClick={exportJson}>Скачать копию</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>Восстановить из файла</Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={importJson} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Данные" subtitle="Демо-данные помогут быстро попробовать систему" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setConfirm('demo')}>Загрузить демо-данные</Button>
            <Button variant="dark" icon="trash" onClick={() => setConfirm('clear')}>Очистить всё</Button>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'demo' ? 'Заменить данные демо-набором?' : 'Удалить все данные?'}
        text="Текущие данные будут потеряны. Сначала скачайте резервную копию."
        confirmLabel={confirm === 'demo' ? 'Загрузить' : 'Очистить'}
        onConfirm={() => { if (confirm === 'demo') resetDemo(); else clearAll(); toast('Готово') }}
      />
    </>
  )
}
