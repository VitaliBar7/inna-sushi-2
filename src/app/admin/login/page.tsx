"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  TextField,
  Label,
  Input,
  buttonVariants,
  cn,
  Header,
  Surface,
  toast,
} from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import NextLink from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/admin");
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.danger("הכניסה נכשלה", { description: error.message });
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <h1 className="text-lg font-semibold text-[color:var(--color-accent-display)]">
            כניסת מנהל
          </h1>
          <NextLink
            href="/"
            className={cn(
              buttonVariants({ variant: "tertiary", size: "sm" }),
            )}
          >
            לתפריט
          </NextLink>
        </div>
      </Header>
      <main className="flex flex-1 items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Surface
          variant="secondary"
          className="w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
        >
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <TextField
            isRequired
            className="w-full"
          >
            <Label>אימייל</Label>
            <Input
              type="email"
              variant="secondary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </TextField>
          <TextField
            isRequired
            className="w-full"
          >
            <Label>סיסמה</Label>
            <Input
              variant="secondary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </TextField>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isPending={loading}
          >
            כניסה
          </Button>
          <p className="text-center text-xs text-foreground/60">
            יוצרים משתמש ב-Supabase → Authentication, או דרך הטלפון של Dashboard.
          </p>
        </form>
        </Surface>
      </main>
    </div>
  );
}
