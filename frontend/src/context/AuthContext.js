import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data?.token) localStorage.setItem("cms_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const registerAdmin = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    // /auth/register returns a UserOut; to have a token for localStorage we do a follow-up login
    await login(email, password);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("cms_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, registerAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
