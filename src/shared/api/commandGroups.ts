import { apiClient } from './client';

export interface CommandGroup {
  id: string;
  userId?: string;
  parentId?: string;
  name: string;
  description?: string;
  color?: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  commandCount?: number;
}

export interface CommandGroupTree extends CommandGroup {
  children: CommandGroupTree[];
}

export interface BulkLoadResponse {
  groups: Array<CommandGroup & { commandIds: string[] }>;
  commands: Array<{
    id: string;
    name: string;
    description?: string;
    command: string;
    fields: any[];
    tags: string[];
    isFavorite: boolean;
    deviceId?: string;
  }>;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export const commandGroupsApi = {
  getGroups: async (): Promise<CommandGroup[]> => {
    const response = await apiClient.get<ApiResponse<CommandGroup[]>>('/command-groups');
    return response.data.data || [];
  },

  getGroupsTree: async (): Promise<CommandGroupTree[]> => {
    const response = await apiClient.get<ApiResponse<CommandGroupTree[]>>('/command-groups/tree');
    return response.data.data || [];
  },

  bulkLoad: async (): Promise<BulkLoadResponse> => {
    const response = await apiClient.get<ApiResponse<BulkLoadResponse>>('/command-groups/bulk/load');
    return response.data.data || { groups: [], commands: [] };
  },

  bulkSaveGroups: async (groups: Array<{
    id?: string;
    parentId?: string | null;
    name: string;
    description?: string;
    color?: string;
    sortOrder: number;
  }>): Promise<CommandGroup[]> => {
    const response = await apiClient.post<ApiResponse<CommandGroup[]>>('/command-groups/bulk/save', groups);
    return response.data.data || [];
  },

  createGroup: async (data: {
    name: string;
    description?: string;
    color?: string;
    parentId?: string;
  }): Promise<CommandGroup> => {
    const response = await apiClient.post<ApiResponse<CommandGroup>>('/command-groups', data);
    return response.data.data!;
  },

  updateGroup: async (id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    sortOrder?: number;
    parentId?: string | null;
  }): Promise<CommandGroup> => {
    const response = await apiClient.put<ApiResponse<CommandGroup>>(`/command-groups/${id}`, data);
    return response.data.data!;
  },

  deleteGroup: async (id: string): Promise<void> => {
    await apiClient.delete(`/command-groups/${id}`);
  },
};

