import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MultipleTerminals from '@components/terminal/MultipleTerminals';
import TabBar from '@components/terminal/TabBar';
import { CommandExecuteDialog } from '@components/commands/CommandExecuteDialog';
import { useMultipleTerminals } from '@hooks/useMultipleTerminals';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Command, CommandField } from '@/stores/commandsStore';

interface ExecuteDialogState {
  isOpen: boolean;
  command: Command | null;
  fieldsToShow: CommandField[];
}

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const { containerRef, runCommand } = useMultipleTerminals();
  const { tabs, activeTabId } = useTerminalStore();
  const { language } = useSettingsStore();
  useKeyboardShortcuts();
  const [executeDialog, setExecuteDialog] = useState<ExecuteDialogState>({
    isOpen: false,
    command: null,
    fieldsToShow: [],
  });

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const buildCommandString = (command: Command, fieldValues: { id: string; value: string }[]): string => {
    let commandStr = command.command;
    const fieldMap = new Map(fieldValues.map(f => [f.id, f.value]));
    
    commandStr = commandStr.replace(/#\[([^\]]+)\]\(([^)]+)\)/g, (_match, _display, id) => {
      return fieldMap.get(id) || '';
    });
    
    return commandStr;
  };

  const executeCommand = (command: Command, fieldValues: { id: string; value: string }[]) => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab || activeTab.isSettings) {
      console.warn('No active terminal tab');
      return;
    }

    const commandStr = buildCommandString(command, fieldValues);
    runCommand(commandStr);
  };

  const handleCommandClick = (command: Command) => {
    const fieldsWithRequest = command.fields.filter(f => f.requestBeforeExecution);
    
    if (fieldsWithRequest.length > 0) {
      setExecuteDialog({
        isOpen: true,
        command,
        fieldsToShow: command.fields,
      });
    } else {
      const fieldValues = command.fields.map(f => ({
        id: f.id,
        value: Array.isArray(f.value) ? f.value[0] || '' : (f.value || ''),
      }));
      executeCommand(command, fieldValues);
    }
  };

  const handleExecuteDialogSubmit = (fieldValues: { id: string; value: string }[]) => {
    if (executeDialog.command) {
      executeCommand(executeDialog.command, fieldValues);
    }
    setExecuteDialog({ isOpen: false, command: null, fieldsToShow: [] });
  };

  const handleExecuteDialogCancel = () => {
    setExecuteDialog({ isOpen: false, command: null, fieldsToShow: [] });
  };

  return (
    <div className="h-screen flex flex-col bg-base-100" data-theme="dark">
      <TabBar onCommandClick={handleCommandClick} />
      <MultipleTerminals ref={containerRef} />
      {executeDialog.command && (
        <CommandExecuteDialog
          isOpen={executeDialog.isOpen}
          commandName={executeDialog.command.name}
          fields={executeDialog.fieldsToShow}
          onExecute={handleExecuteDialogSubmit}
          onCancel={handleExecuteDialogCancel}
        />
      )}
    </div>
  );
};

export default App;
