import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import api from "./services/api";
import { Login, Register } from "./auth/Auth";
import { Layout } from "./layout/Layout";

function App() {
  const [token, setToken] = useState(localStorage.getItem("ml_token"));
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("llm_theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("llm_theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");
  useEffect(() => {
    if (token)
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => {
          setToken(null);
          localStorage.removeItem("ml_token");
        });
  }, [token]);
  const login = (tokenValue, person) => {
    localStorage.setItem("ml_token", tokenValue);
    setToken(tokenValue);
    setUser(person);
  };
  const logout = () => {
    localStorage.removeItem("ml_token");
    setToken(null);
    setUser(null);
  };
  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" /> : <Login onLogin={login} theme={theme} onToggleTheme={toggleTheme} />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/" /> : <Register onLogin={login} theme={theme} onToggleTheme={toggleTheme} />}
      />
      <Route
        path="/*"
        element={
          token ? (
            <Layout user={user} logout={logout} theme={theme} onToggleTheme={toggleTheme} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}


export default App;
