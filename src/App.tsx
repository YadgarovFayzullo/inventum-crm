import { lazy, Suspense, type ReactNode } from 'react'
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
const Finance = lazy(() => import('@/pages/Finance'))
const Settings = lazy(() => import('@/pages/Settings'))
const UiKit = lazy(() => import('@/pages/UiKit'))
const Login = lazy(() => import('@/pages/Login'))

/** Страница доступна только при нужном праве, иначе — на главную */
function Guard({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { can } = useAccess()
  return can(perm) ? children : <Navigate to={can('academic') ? '/' : '/finance'} replace />
}

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={null}><Login /></Suspense> },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Guard perm="academic"><Dashboard /></Guard> },
      { path: '/students', element: <Guard perm="academic"><Students /></Guard> },
      { path: '/students/:id', element: <Guard perm="academic"><StudentDetail /></Guard> },
      { path: '/groups', element: <Guard perm="academic"><Groups /></Guard> },
      { path: '/groups/:id', element: <Guard perm="academic"><GroupDetail /></Guard> },
      { path: '/attendance', element: <Guard perm="academic"><Attendance /></Guard> },
      { path: '/payments', element: <Guard perm="payments"><Payments /></Guard> },
      { path: '/finance', element: <Guard perm="finance"><Finance /></Guard> },
      { path: '/leads', element: <Guard perm="leads"><Leads /></Guard> },
      { path: '/teachers', element: <Guard perm="teachers.view"><Teachers /></Guard> },
      { path: '/courses', element: <Guard perm="courses"><Courses /></Guard> },
      { path: '/settings', element: <Guard perm="settings"><Settings /></Guard> },
      { path: '/ui-kit', element: <Guard perm="uikit"><UiKit /></Guard> },
      { path: '*', element: <Guard perm="academic"><Dashboard /></Guard> },
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
