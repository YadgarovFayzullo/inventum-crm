import { lazy } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout'
import { useAccess, type Perm } from '@/store/auth'
import { Toaster } from '@/ui'

// Код каждой страницы грузится отдельным чанком — первый экран открывается мгновенно
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Students = lazy(() => import('@/pages/Students'))
const StudentDetail = lazy(() => import('@/pages/StudentDetail'))
const Groups = lazy(() => import('@/pages/Groups'))
const GroupDetail = lazy(() => import('@/pages/GroupDetail'))
const Attendance = lazy(() => import('@/pages/Attendance'))
const Payments = lazy(() => import('@/pages/Payments'))
const Leads = lazy(() => import('@/pages/Leads'))
const Teachers = lazy(() => import('@/pages/Teachers'))
const Courses = lazy(() => import('@/pages/Courses'))
const Settings = lazy(() => import('@/pages/Settings'))
const UiKit = lazy(() => import('@/pages/UiKit'))

/** Страница доступна только при нужном праве, иначе — на главную */
function Guard({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { can } = useAccess()
  return can(perm) ? children : <Navigate to="/" replace />
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/students', element: <Students /> },
      { path: '/students/:id', element: <StudentDetail /> },
      { path: '/groups', element: <Groups /> },
      { path: '/groups/:id', element: <GroupDetail /> },
      { path: '/attendance', element: <Attendance /> },
      { path: '/payments', element: <Guard perm="payments"><Payments /></Guard> },
      { path: '/leads', element: <Guard perm="leads"><Leads /></Guard> },
      { path: '/teachers', element: <Guard perm="teachers.view"><Teachers /></Guard> },
      { path: '/courses', element: <Guard perm="courses"><Courses /></Guard> },
      { path: '/settings', element: <Guard perm="settings"><Settings /></Guard> },
      { path: '/ui-kit', element: <Guard perm="uikit"><UiKit /></Guard> },
      { path: '*', element: <Dashboard /> },
    ],
  },
])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
