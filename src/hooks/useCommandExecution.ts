import { Command } from '@/stores/commandsStore';

export interface CommandExecutionHandler {
  handleCommandClick: (command: Command) => void;
  executeCommandDirectly: (command: Command) => void;
}

interface UseCommandExecutionOptions {
  runCommand: (command: string) => void;
  onOpenDialog?: (command: Command) => void;
}

/**
 * Hook that provides command execution logic shared between keyboard shortcuts and UI clicks
 */
export const useCommandExecution = (options: UseCommandExecutionOptions): CommandExecutionHandler => {
  const { runCommand, onOpenDialog } = options;

  const executeCommandDirectly = (command: Command) => {
    const fieldValues = command.fields.map(f => ({
      id: f.id,
      value: Array.isArray(f.value) ? f.value[0] || '' : (f.value || ''),
    }));
    
    // Build command string with field values
    let commandStr = command.command;
    const fieldMap = new Map(fieldValues.map(f => [f.id, f.value]));
    
    commandStr = commandStr.replace(/#\[([^\]]+)\]\(([^)]+)\)/g, (_match, _display, id) => {
      return fieldMap.get(id) || '';
    });

    runCommand(commandStr);
  };

  const handleCommandClick = (command: Command) => {
    const fieldsWithRequest = command.fields.filter(f => f.requestBeforeExecution);
    
    if (fieldsWithRequest.length > 0) {
      // If fields require user input and dialog callback is provided, open dialog
      if (onOpenDialog) {
        onOpenDialog(command);
      } else {
        // If no dialog handler (e.g., keyboard shortcut without dialog), skip execution
        console.log('Command requires user input, cannot execute automatically');
      }
    } else {
      // No user input required, execute directly
      executeCommandDirectly(command);
    }
  };

  return {
    handleCommandClick,
    executeCommandDirectly,
  };
};
