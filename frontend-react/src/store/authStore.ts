import { create } from "zustand";
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from "../services/auth";
import { getProfile, updateProfile } from "../services/user";
import type { UserProfileUpdate } from "../services/user";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  language?: string;
  role?: string;
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    email: string,
  ) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  user: null,
  login: async (username, password) => {
    const token = await apiLogin(username, password);
    set({ token, isAuthenticated: true });
    await useAuthStore.getState().fetchProfile();
  },
  register: async (username, password, email) => {
    await apiRegister(username, password, email);
    // Registration successful, but user needs to login separately
  },
  logout: () => {
    apiLogout();
    set({ token: null, isAuthenticated: false, user: null });
  },
  fetchProfile: async () => {
    const user = await getProfile();
    set({ user });
  },
  updateProfile: async (data) => {
    const user = await updateProfile(data);
    set({ user });
  },
}));
