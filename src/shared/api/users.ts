import { apiClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  profile: {
    id: string;
    firstName: string | null;
    avatarUrl: string | null;
    settings: Record<string, any>;
  } | null;
}

export interface UpdateProfileRequest {
  email?: string;
  firstName?: string;
  avatarUrl?: string;
}

export interface ApiResponse<T> {
  status: string;
  data?: T;
  message?: string;
}

export const usersApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/users/profile');
    return response.data.data!;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.put<ApiResponse<UserProfile>>('/users/profile', data);
    return response.data.data!;
  },
};

