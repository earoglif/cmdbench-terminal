import { create } from 'zustand';
import { authApi } from '@/shared/api/auth';
import { usersApi, UserProfile } from '@/shared/api/users';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  userProfile: UserProfile | null;
}

interface AuthActions {
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: (skipApiCall?: boolean) => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  fetchProfile: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  userProfile: null,

  initialize: async () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && refreshToken) {
      set({
        isAuthenticated: true,
        accessToken,
        refreshToken,
      });
      await get().fetchProfile();
    }

    window.addEventListener('auth:logout', () => {
      get().logout(true);
    });
  },

  login: async (emailOrUsername: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await authApi.login({ emailOrUsername, password });
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      set({
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
        error: null,
      });
      await get().fetchProfile();
    } catch (error: any) {
      let errorMessage = 'Login failed';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors
            .map((e: any) => e.message || e.path?.join('.'))
            .join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      });
      throw error;
    }
  },

  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await authApi.register({ email, username, password });
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      set({
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isLoading: false,
        error: null,
      });
      await get().fetchProfile();
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors
            .map((e: any) => e.message || e.path?.join('.'))
            .join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      });
      throw error;
    }
  },

  logout: async (skipApiCall = false) => {
    const { refreshToken, isAuthenticated } = get();
    
    if (!isAuthenticated && !refreshToken) {
      return;
    }

    try {
      if (refreshToken && !skipApiCall) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      // Silently ignore logout API errors - we're logging out anyway
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        error: null,
        userProfile: null,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  fetchProfile: async () => {
    try {
      const profile = await usersApi.getProfile();
      set({ userProfile: profile });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },
}));

