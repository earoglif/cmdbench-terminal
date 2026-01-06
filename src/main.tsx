import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './localization'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { remoteControlService } from './shared/services/remoteControl'

const initializeApp = async () => {
  await useAuthStore.getState().initialize()
  useSettingsStore.getState().initialize()
  
  const { remoteControlEnabled } = useSettingsStore.getState()
  const { isAuthenticated } = useAuthStore.getState()
  
  if (remoteControlEnabled && isAuthenticated) {
    remoteControlService.connect()
  }
}

initializeApp().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)