import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useSession } from './store/auth'
import './styles/global.css'

// Сначала спрашиваем сервер, вошёл ли пользователь, — чтобы не мигала страница входа
useSession
  .getState()
  .init()
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
