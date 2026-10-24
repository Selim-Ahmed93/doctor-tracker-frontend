"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon, Loader2Icon, StethoscopeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ email, password }) => {
  const errors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
};

export default function LoginPage() {
  const router = useRouter();
  const { status, login } = useAuth();

  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      await login(values.email.trim(), values.password);
      // The effect above performs the redirect once the session is set.
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422) {
          setFieldErrors(error.fieldErrors);
          setFormError("Please correct the highlighted fields.");
        } else if (error.isUnauthorized) {
          setFormError("Invalid email or password.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || status === "loading";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <StethoscopeIcon className="size-5" />
          </div>
          <h1 className="font-heading text-xl font-semibold">Doctor Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage doctors and patients.
          </p>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>
              Use the administrator account provided to you.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              {formError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  value={values.email}
                  onChange={updateField("email")}
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
                {fieldErrors.email ? (
                  <p id="email-error" className="text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={values.password}
                  onChange={updateField("password")}
                  disabled={busy}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                />
                {fieldErrors.password ? (
                  <p id="password-error" className="text-xs text-destructive">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {submitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Accounts are created by the administrator. There is no public sign-up.
        </p>
      </div>
    </main>
  );
}
