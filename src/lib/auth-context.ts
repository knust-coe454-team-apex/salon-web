import { createContext, useContext } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  businessId: string;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

export const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => "Auth is not ready.",
  signOut: () => {},
  refresh: async () => {},
});

export const useAuth = () => useContext(AuthCtx);
