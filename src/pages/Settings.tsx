import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ApiError, api } from '@/lib/api'
import { today } from '@/lib/dates'
import { fullName } from '@/lib/format'
import { ROLE_LABEL, useSession, type Role } from '@/store/auth'
import { useStore, type Data } from '@/store/store'
import { Badge, Button, Card, CardHeader, ConfirmDialog, IconButton, Input, Modal, PageHeader, Select, toast } from '@/ui'

type UserRow = { id: string; email: string; role: Role; name: string; teacherId: string }

function UserModal({ open, onClose, onSaved, user }: { open: boolean; onClose: () => void; onSaved: () => void; user: UserRow | null }) {
  const me = useSession((s) => s.user)!
  const teachers = useStore((s) => s.teachers)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('manager')
  const [teacherId, setTeacherId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const self = !!user && user.id === me.id

  useEffect(() => {
    if (!open) return
    setEmail(user?.email ?? '')
    setPassword('')
    setRole(user?.role ?? 'manager')
    setTeacherId(user?.teacherId ?? '')
    setError('')
  }, [open, user])

  const passwordOk = user ? password === '' || password.length >= 8 : password.length >= 8
  const valid = email.trim().length > 3 && passwordOk && (role !== 'teacher' || !!teacherId)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (user) {
        // отправляем только то, что изменилось
        const patch: Record<string, string> = {}
        if (email.trim().toLowerCase() !== user.email) patch.email = email
        if (role !== user.role) patch.role = role
        if (role === 'teacher' && teacherId !== user.teacherId) patch.teacherId = teacherId
        if (password) patch.password = password
        if (Object.keys(patch).length) await api.patch(`/users/${user.id}`, patch)
      } else {
        await api.post('/users', { email, password, role, teacherId: role === 'teacher' ? teacherId : undefined })
      }
      toast(user ? 'Изменения сохранены' : 'Пользователь создан')
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Пользователь' : 'Новый пользователь'}
      description={user ? ROLE_LABEL[user.role] : 'Он сможет войти по этому email и паролю'}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button disabled={!valid || busy} onClick={submit}>Сохранить</Button>
        </>
      }
    >
      <Input label="Email (логин)" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!user} />
      <Select
        label="Роль"
        value={role}
        disabled={self}
        onChange={(v) => setRole(v as Role)}
        options={(['owner', 'manager', 'teacher'] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        hint={self ? 'Свою роль менять нельзя' : role === 'owner' ? 'Владелец видит всё, включая зарплаты и настройки' : role === 'manager' ? 'Ученики, группы, оплаты, лиды — без зарплат и настроек' : 'Только свои группы и посещаемость'}
      />
      {role === 'teacher' && (
        <Select
          label="Преподаватель"
          value={teacherId}
          onChange={setTeacherId}
          placeholder="Выберите преподавателя"
          options={teachers.map((t) => ({ value: t.id, label: fullName(t) }))}
          hint="Сначала добавьте его на странице «Преподаватели»"
        />
      )}
      <Input
        label={user ? 'Новый пароль' : 'Пароль'}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={user ? 'Оставьте пустым, чтобы не менять' : ''}
        hint="Минимум 8 символов"
        error={error}
      />
    </Modal>
  )
}

function UsersCard() {
  const me = useSession((s) => s.user)!
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [edit, setEdit] = useState<UserRow | null>(null)
  const [create, setCreate] = useState(false)
  const [toDelete, setToDelete] = useState<UserRow | null>(null)

  const reload = useCallback(() => {
    api.get<UserRow[]>('/users').then(setUsers).catch(() => toast('Не удалось загрузить пользователей', 'error'))
  }, [])
  useEffect(reload, [reload])

  return (
    <Card>
      <CardHeader
        title="Пользователи"
        subtitle="Создавайте логины и выдавайте роли: владелец, менеджер, преподаватель"
        actions={<Button size="sm" icon="userPlus" onClick={() => setCreate(true)}>Добавить</Button>}
      />
      <div className="-mx-2 flex flex-col">
        {users?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{u.name}{u.id === me.id && <span className="font-normal text-subtle"> · это вы</span>}</div>
              <div className="truncate text-[13px] text-muted">{u.email}</div>
            </div>
            <Badge tone={u.role === 'owner' ? 'dark' : u.role === 'manager' ? 'soft' : 'outline'}>{ROLE_LABEL[u.role]}</Badge>
            <IconButton icon="edit" size="sm" label="Изменить роль и доступ" onClick={() => setEdit(u)} />
            {u.id !== me.id && <IconButton icon="trash" size="sm" label="Удалить" onClick={() => setToDelete(u)} />}
          </div>
        ))}
        {users === null && <p className="py-4 text-center text-muted">Загрузка…</p>}
      </div>
      <UserModal open={create || !!edit} user={edit} onClose={() => { setCreate(false); setEdit(null) }} onSaved={reload} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Удалить пользователя?"
        text={toDelete ? `${toDelete.email} больше не сможет войти.` : undefined}
        onConfirm={() => {
          api.del(`/users/${toDelete!.id}`).then(() => { toast('Пользователь удалён'); reload() }).catch((e) => toast(e instanceof ApiError ? e.message : 'Ошибка', 'error'))
        }}
      />
    </Card>
  )
}

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const { updateSettings, resetDemo, clearAll, importData } = useStore.getState()
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
    e.target.value = ''
    if (!file) return
    try {
      await importData(JSON.parse(await file.text()) as Data)
      toast('Данные восстановлены')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Не удалось прочитать файл', 'error')
    }
  }

  const run = (fn: () => Promise<void>) => fn().then(() => toast('Готово')).catch((err) => toast(err instanceof ApiError ? err.message : 'Ошибка', 'error'))

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
        <UsersCard />
        <Card>
          <CardHeader title="Резервная копия" subtitle="Скачайте копию данных в файл или восстановите из файла. Фотографии учеников в копию не входят." />
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
        text="Все ученики, группы, оплаты и посещаемость на сервере будут заменены. Сначала скачайте резервную копию. Пользователи (логины) сохранятся."
        confirmLabel={confirm === 'demo' ? 'Загрузить' : 'Очистить'}
        onConfirm={() => run(confirm === 'demo' ? resetDemo : clearAll)}
      />
    </>
  )
}
