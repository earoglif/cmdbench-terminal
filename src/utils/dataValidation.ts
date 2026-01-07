import { Command, CommandField } from '@/stores/commandsStore';
import { CommandGroup } from '@/stores/commandGroupsStore';

export interface ExportData {
  version: string;
  exportDate: string;
  commands: Command[];
  groups: CommandGroup[];
}

// Validate CommandField structure
const isValidCommandField = (field: any): field is CommandField => {
  if (typeof field !== 'object' || field === null) return false;
  
  return (
    typeof field.id === 'string' &&
    ['string', 'number', 'file', 'directory', 'select'].includes(field.type) &&
    typeof field.isRequired === 'boolean' &&
    typeof field.name === 'string' &&
    (typeof field.value === 'string' || Array.isArray(field.value)) &&
    (field.description === undefined || typeof field.description === 'string') &&
    (field.requestBeforeExecution === undefined || typeof field.requestBeforeExecution === 'boolean')
  );
};

// Validate Command structure
const isValidCommand = (command: any): command is Command => {
  if (typeof command !== 'object' || command === null) return false;
  
  const hasRequiredFields =
    typeof command.id === 'string' &&
    typeof command.name === 'string' &&
    typeof command.command === 'string';
  
  if (!hasRequiredFields) return false;
  
  // Validate optional fields
  if (command.description !== undefined && typeof command.description !== 'string') return false;
  if (command.fields !== undefined && (!Array.isArray(command.fields) || !command.fields.every(isValidCommandField))) return false;
  if (command.tags !== undefined && (!Array.isArray(command.tags) || !command.tags.every((t: any) => typeof t === 'string'))) return false;
  if (command.groups !== undefined && (!Array.isArray(command.groups) || !command.groups.every((g: any) => typeof g === 'string'))) return false;
  if (command.isFavorite !== undefined && typeof command.isFavorite !== 'boolean') return false;
  if (command.executionCount !== undefined && typeof command.executionCount !== 'number') return false;
  if (command.lastExecutedAt !== undefined && typeof command.lastExecutedAt !== 'string') return false;
  
  return true;
};

// Validate CommandGroup structure
const isValidCommandGroup = (group: any): group is CommandGroup => {
  if (typeof group !== 'object' || group === null) return false;
  
  const hasRequiredFields =
    typeof group.id === 'string' &&
    typeof group.name === 'string' &&
    typeof group.sortOrder === 'number';
  
  if (!hasRequiredFields) return false;
  
  // Validate optional fields
  if (group.parentId !== undefined && typeof group.parentId !== 'string') return false;
  if (group.description !== undefined && typeof group.description !== 'string') return false;
  if (group.color !== undefined && typeof group.color !== 'string') return false;
  if (group.commandCount !== undefined && typeof group.commandCount !== 'number') return false;
  
  return true;
};

// Validate entire export data structure
export const validateExportData = (data: any): data is ExportData => {
  if (typeof data !== 'object' || data === null) return false;
  
  // Check version and exportDate
  if (typeof data.version !== 'string' || typeof data.exportDate !== 'string') return false;
  
  // Check commands array
  if (!Array.isArray(data.commands) || !data.commands.every(isValidCommand)) return false;
  
  // Check groups array
  if (!Array.isArray(data.groups) || !data.groups.every(isValidCommandGroup)) return false;
  
  return true;
};

// Create export data with current timestamp
export const createExportData = (commands: Command[], groups: CommandGroup[]): ExportData => {
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    commands,
    groups,
  };
};
