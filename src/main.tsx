import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './localization'
import { useSettingsStore } from './stores/settingsStore'
import { useShortcutsStore } from './stores/shortcutsStore'

const initializeApp = async () => {
  useSettingsStore.getState().initialize()
  useShortcutsStore.getState().initializeDefaultShortcuts()
}

initializeApp().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)