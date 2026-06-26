import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In — Sunil Plumbing Services" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) {
    return "Email or password is incorrect. If you just created the account, double-check the password you used.";
  }
  if (m.includes("email not confirmed")) {
    return "This email hasn't been confirmed yet. Please check your inbox for the confirmation link.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("password should be") || m.includes("weak password") || m.includes("pwned")) {
    return "That password is too weak or has appeared in a data breach. Please choose a stronger one.";
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/schedule", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setError("Please enter your full name.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin + "/auth",
          },
        });
        if (error) {
          setError(mapAuthError(error.message));
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate({ to: "/schedule", replace: true });
        } else {
          setInfo("Account created. You can sign in now.");
          setMode("signin");
          setPassword("");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(mapAuthError(error.message));
        return;
      }
      navigate({ to: "/schedule", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Network/config failures (e.g. no backend reachable) land here.
      if (/fetch|network|failed/i.test(message)) {
        setError(
          "Can't reach the authentication service right now. Please check your connection and try again.",
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="grid place-items-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold leading-none">Sunil Plumbing</p>
            <p className="text-xs text-muted-foreground">Staff portal</p>
          </div>
        </Link>

        <form
          onSubmit={onSubmit}
          className="bg-card border rounded-2xl shadow-soft p-7"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 grid place-items-center mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">
              {mode === "signin" ? "Staff Sign In" : "Create Staff Account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Authorized staff only."
                : "The first account becomes the Owner. New accounts join as Helpers."}
            </p>
          </div>

          <div className="grid gap-4">
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-2 grid place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              )}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-md border bg-muted text-foreground text-sm px-3 py-2">
                {info}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  {mode === "signin" ? "Signing in…" : "Creating…"}
                </>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>

            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setError(null);
                setInfo(null);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
            >
              {mode === "signin"
                ? "Create a staff account"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>

        <p className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to booking page
          </Link>
        </p>
      </div>
    </div>
  );
}
