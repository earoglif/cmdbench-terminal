import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MultipleTerminals from '@components/terminal/MultipleTerminals';
import TabBar from '@components/terminal/TabBar';
import { CommandExecuteDialog } from '@components/commands/CommandExecuteDialog';
import { useMultipleTerminals } from '@hooks/useMultipleTerminals';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { useCommandExecution } from '@hooks/useCommandExecution';
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { buildCommandString } from '@/utils/commandUtils';
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

  const [executeDialog, setExecuteDialog] = useState<ExecuteDialogState>({
    isOpen: false,
    command: null,
    fieldsToShow: [],
  });

  const handleOpenDialog = (command: Command) => {
    setExecuteDialog({
      isOpen: true,
      command,
      fieldsToShow: command.fields,
    });
  };

  const { handleCommandClick } = useCommandExecution({ 
    runCommand, 
    onOpenDialog: handleOpenDialog 
  });
  
  useKeyboardShortcuts({ runCommand, onOpenDialog: handleOpenDialog });

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const executeCommand = (command: Command, fieldValues: { id: string; value: string }[]) => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab || activeTab.isSettings) {
      console.warn('No active terminal tab');
      return;
    }

    const commandStr = buildCommandString(command, fieldValues);
    runCommand(commandStr);
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
