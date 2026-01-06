import { apiClient } from './client';

export interface CommandField {
  id: string;
  type: 'string' | 'number' | 'file' | 'directory' | 'select';
  isRequired: boolean;
  requestBeforeExecution?: boolean;
  name: string;
  description?: string;
  value: string | string[];
}

export interface Command {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  command: string;
  fields: CommandField[];
  tags?: string[];
  isFavorite?: boolean;
  deviceId?: string;
  groups?: string[];
  createdAt?: string;
  updatedAt?: string;
  executionCount?: number;
  lastExecutedAt?: string;
}

export interface CreateCommandData {
  name: string;
  description?: string;
  command: string;
  fields?: CommandField[];
  tags?: string[];
  groups?: string[];
  deviceId?: string;
}

export interface UpdateCommandData extends Partial<CreateCommandData> {}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export const commandsApi = {
  getCommands: async (filters?: {
    groupId?: string;
    search?: string;
    isFavorite?: boolean;
    includeGroups?: boolean;
  }): Promise<Command[]> => {
    const params = new URLSearchParams();
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isFavorite !== undefined) params.append('isFavorite', String(filters.isFavorite));
    if (filters?.includeGroups) params.append('includeGroups', 'true');
    
    const response = await apiClient.get<ApiResponse<Command[]>>(`/commands?${params}`);
    return response.data.data || [];
  },

  getCommandById: async (id: string): Promise<Command> => {
    const response = await apiClient.get<ApiResponse<Command>>(`/commands/${id}`);
    return response.data.data!;
  },

  createCommand: async (data: CreateCommandData): Promise<Command> => {
    const response = await apiClient.post<ApiResponse<Command>>('/commands', data);
    return response.data.data!;
  },

  updateCommand: async (id: string, data: UpdateCommandData): Promise<Command> => {
    const response = await apiClient.put<ApiResponse<Command>>(`/commands/${id}`, data);
    return response.data.data!;
  },

  deleteCommand: async (id: string): Promise<void> => {
    await apiClient.delete(`/commands/${id}`);
  },

  toggleFavorite: async (id: string): Promise<Command> => {
    const response = await apiClient.patch<ApiResponse<Command>>(`/commands/${id}/favorite`);
    return response.data.data!;
  },

  bulkSaveCommands: async (commands: Array<Omit<Command, 'userId' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    await apiClient.post('/commands/bulk/save', commands);
  },

  bulkSaveCommandGroups: async (data: Array<{ commandId: string; groupIds: string[] }>): Promise<void> => {
    await apiClient.post('/commands/bulk/save-groups', data);
  },
};

