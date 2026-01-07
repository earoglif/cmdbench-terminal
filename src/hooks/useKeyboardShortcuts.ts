import { useEffect } from 'react';
import { useTerminalStore } from '@/stores/terminalStore';
import { useShortcutsStore } from '@/stores/shortcutsStore';
import { useCommandsStore } from '@/stores/commandsStore';
import { useCommandExecution } from '@/hooks/useCommandExecution';
import { Command } from '@/stores/commandsStore';

interface UseKeyboardShortcutsOptions {
  runCommand: (command: string) => void;
  onOpenDialog?: (command: Command) => void;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTerminalStore();
  const { shortcuts, isEditorModalOpen } = useShortcutsStore();
  const { commands } = useCommandsStore();
  const { runCommand, onOpenDialog } = options;

  const { handleCommandClick } = useCommandExecution({ runCommand, onOpenDialog });

  const normalizeEventKeys = (event: KeyboardEvent): string => {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    const key = event.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      if (key === ' ') {
        parts.push('Space');
      } else if (key.length === 1) {
        parts.push(key.toUpperCase());
      } else {
        parts.push(key);
      }
    }
    
    return parts.join('+');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if ShortcutEditorModal is open
      if (isEditorModalOpen) {
        return;
      }

      const pressedKeys = normalizeEventKeys(event);
      
      // Find matching shortcut
      const matchingShortcut = shortcuts.find((s) => s.keys === pressedKeys);
      
      if (!matchingShortcut) return;

      event.preventDefault();

      // Handle system shortcuts
      if (matchingShortcut.isSystem) {
        switch (matchingShortcut.action) {
          case 'newTab':
            addTab();
            break;
            
          case 'closeTab':
            if (activeTabId && tabs.length > 1) {
              removeTab(activeTabId);
            }
            break;
            
          case 'nextTab':
            if (activeTabId) {
              const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex].id);
            }
            break;
            
          case 'prevTab':
            if (activeTabId) {
              const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
              const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
              setActiveTab(tabs[prevIndex].id);
            }
            break;
        }
      } else if (matchingShortcut.commandId) {
        // Handle command shortcuts - use the shared command execution logic
        const command = commands.find((c) => c.id === matchingShortcut.commandId);
        if (command) {
          handleCommandClick(command);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, addTab, removeTab, setActiveTab, shortcuts, commands, runCommand, isEditorModalOpen]);
};