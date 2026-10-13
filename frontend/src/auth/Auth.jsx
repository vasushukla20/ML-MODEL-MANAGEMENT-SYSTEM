import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { message } from "../services/api";
import { Notice, Field, input } from "../components/shared";
import { ThemeToggle } from "../components/ThemeToggle";

export function Login({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      onLogin(data.access_token, data.user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-wordmark"><span className="brand-mark">L</span><span>LLM MANAGEMENT SYSTEM</span></div>
        <h1>
          Keep the research in order.
          <br />
          <em>Know what worked.</em>
        </h1>
        <p>
          One workspace for models, datasets, experiments, and the runs that connect them.
        </p>
        <div className="auth-index"><span>01 / ORGANIZE</span><span>02 / COMPARE</span><span>03 / DECIDE</span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-theme"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
        <div className="auth-card">
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p>Continue managing your machine learning research.</p>
          <form onSubmit={submit}>
            <Field label="Email address">
              {input(email, setEmail, {
                type: "email",
                required: true,
                placeholder: "you@example.com",
              })}
            </Field>
            <Field label="Password">
              {input(password, setPassword, {
                type: "password",
                required: true,
                placeholder: "Enter password",
              })}
            </Field>
            <Notice error={error} />
            <button className="button primary wide" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </div>
          <div className="demo-box">
            <strong>Demo accounts</strong>
            <span>Researcher: researcher@demo.com / demo123</span>
            <span>Admin: admin@demo.com / admin123</span>
            <span>Developer: developer@demo.com / demo123</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Register({ onLogin, theme, onToggleTheme }) {
  const [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/register", form);
      const { data } = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      onLogin(data.access_token, data.user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-wordmark"><span className="brand-mark">L</span><span>LLM MANAGEMENT SYSTEM</span></div>
        <h1>
          Give every experiment
          <br />
          <em>a place to live.</em>
        </h1>
        <p>Your own workspace for projects, models, and results.</p>
      </div>
      <div className="auth-panel">
        <div className="auth-theme"><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div>
        <div className="auth-card">
          <div className="eyebrow">GET STARTED</div>
          <h2>Create your account</h2>
          <form onSubmit={submit}>
            <Field label="Full name">
              {input(form.name, (v) => set("name", v), {
                required: true,
                minLength: 2,
              })}
            </Field>
            <Field label="Email address">
              {input(form.email, (v) => set("email", v), {
                type: "email",
                required: true,
              })}
            </Field>
            <Field label="Password (6+ characters)">
              {input(form.password, (v) => set("password", v), {
                type: "password",
                required: true,
                minLength: 6,
              })}
            </Field>
            <Notice error={error} />
            <button className="button primary wide" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

