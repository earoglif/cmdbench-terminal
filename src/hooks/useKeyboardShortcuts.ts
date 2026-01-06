import { useEffect } from 'react';
import { useTerminalStore } from '@/stores/terminalStore';

export const useKeyboardShortcuts = () => {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTerminalStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+T - новый таб
      if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        addTab();
        return;
      }

      // Ctrl+W - закрыть текущий таб
      if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        if (activeTabId && tabs.length > 1) {
          removeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Tab - следующий таб
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        if (activeTabId) {
          const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
        }
        return;
      }

      // Ctrl+Shift+Tab - предыдущий таб
      if (event.ctrlKey && event.shiftKey && event.key === 'Tab') {
        event.preventDefault();
        if (activeTabId) {
          const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
          const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          setActiveTab(tabs[prevIndex].id);
        }
        return;
      }

      // Ctrl+1-9 - переключение на таб по номеру
      if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex < tabs.length) {
          setActiveTab(tabs[tabIndex].id);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab]);
};