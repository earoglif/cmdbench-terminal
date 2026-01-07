import { Command } from '@/stores/commandsStore';

/**
 * Builds a command string by replacing field placeholders with actual values
 * @param command - The command object containing the command template
 * @param fieldValues - Array of field id-value pairs to substitute into the command
 * @returns The final command string with all placeholders replaced
 */
export const buildCommandString = (
  command: Command,
  fieldValues: { id: string; value: string }[]
): string => {
  let commandStr = command.command;
  const fieldMap = new Map(fieldValues.map(f => [f.id, f.value]));
  
  commandStr = commandStr.replace(/#\[([^\]]+)\]\(([^)]+)\)/g, (_match, _display, id) => {
    return fieldMap.get(id) || '';
  });
  
  return commandStr;
};
