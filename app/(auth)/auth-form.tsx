"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import { useState } from "react";
import {
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-[18px] animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="size-[18px]" />
        </>
      )}
    </Button>
  );
}


export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const checkEmail = params.get("check_email");
  const urlError = params.get("error");
  const isSignup = mode === "signup";
  const [showPw, setShowPw] = useState(false);

  const action = isSignup ? signUpWithPassword : signInWithPassword;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="flex min-h-dvh">
      {/* Left: form */}
      <div className="flex grow items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-[360px]">
          <Logo markClassName="size-10" textClassName="text-[26px]" />
          <h1 className="mt-8 text-[25px] font-bold tracking-tight">
            {isSignup ? "Create your workspace" : "Welcome back"}
          </h1>
          <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
            {isSignup
              ? "Start organizing your team's work in minutes."
              : "Log in to pick up where you left off."}
          </p>

          {checkEmail && (
            <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Check your email to confirm your account, then sign in.
            </p>
          )}
          {(state?.error || urlError) && (
            <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state?.error ?? urlError}
            </p>
          )}


          <form action={formAction} className="space-y-3.5">
            <input type="hidden" name="redirect" value={redirect} />
            {isSignup && (
              <AuthField
                label="Full name"
                name="full_name"
                icon={<User className="size-[17px]" />}
                placeholder="Maya Chen"
                autoComplete="name"
              />
            )}
            <AuthField
              label="Email"
              name="email"
              type="email"
              required
              icon={<Mail className="size-[17px]" />}
              placeholder="you@company.com"
              autoComplete="email"
            />
            <AuthField
              label="Password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              icon={<Lock className="size-[17px]" />}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              right={
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="text-muted-foreground"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            <SubmitButton label={isSignup ? "Create workspace" : "Log in"} />
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "New to Task Mate? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-primary"
            >
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>

      {/* Right: decorative panel */}
      <div
        className="relative hidden w-[46%] max-w-[620px] flex-col justify-center overflow-hidden border-l p-10 lg:flex"
        style={{
          background:
            "linear-gradient(150deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 50%, var(--background)) 60%, var(--background) 100%)",
        }}
      >
        <div className="mx-auto flex max-w-[440px] flex-col gap-5">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-accent-foreground">
            <Zap className="size-[15px]" /> TRUSTED BY FAST-MOVING TEAMS
          </div>
          <p className="text-2xl font-semibold leading-snug tracking-tight">
            &ldquo;Task Mate replaced three tools for us. Our team finally has one
            calm place to see what&apos;s next.&rdquo;
          </p>
          <div className="text-sm">
            <p className="font-semibold">Diego Ramos</p>
            <p className="text-muted-foreground">Head of Product, Northwind</p>
          </div>
          <MiniBoard />
        </div>
      </div>
    </div>
  );
}

function AuthField({
  label,
  name,
  type = "text",
  icon,
  placeholder,
  required,
  autoComplete,
  right,
}: {
  label: string;
  name: string;
  type?: string;
  icon: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  right?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-secondary-foreground">
        {label}
      </span>
      <span className="flex h-[42px] items-center gap-2 rounded-[var(--radius)] border border-border-strong bg-card px-3 shadow-sm focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--accent)]">
        <span className="text-muted-foreground">{icon}</span>
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 border-0 bg-transparent text-sm font-medium outline-none"
        />
        {right}
      </span>
    </label>
  );
}

function MiniBoard() {
  const cols = [
    { name: "To Do", color: "oklch(0.6 0.14 300)", cards: ["New nav concepts", "Onboarding audit"] },
    { name: "In Progress", color: "oklch(0.62 0.13 250)", cards: ["Cold-start crash"] },
    { name: "Done", color: "oklch(0.64 0.13 155)", cards: ["Migrate auth SDK"] },
  ];
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-[var(--radius-md)] border bg-card p-3.5 shadow-md">
      {cols.map((c) => (
        <div key={c.name} className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-secondary-foreground">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </div>
          {c.cards.map((t) => (
            <div key={t} className="rounded-[9px] border bg-muted/50 p-2.5">
              <p className="text-[11.5px] font-medium leading-tight">{t}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
