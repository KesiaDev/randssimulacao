// Garante uma única sessão ativa por conta (evita vendedor emprestar login
// pra colega usar ao mesmo tempo). A cada login novo, claimSession() grava
// um carimbo novo no perfil; checkSession() é chamado em intervalos curtos
// pelo app pra ver se o carimbo ainda é o mesmo — se outro login aconteceu
// em outro aparelho, o carimbo muda e esse aparelho é deslogado na hora,
// sem precisar esperar o token expirar.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = crypto.randomUUID();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active_session_token: token })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { token };
  });

export const checkSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("active_session_token")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { valid: !!profile?.active_session_token && profile.active_session_token === data.token };
  });
