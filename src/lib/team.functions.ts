import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar suas permissões.");
  if (!data) throw new Error("Apenas administradores podem executar esta ação.");
}

export const createSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().trim().optional().default(""),
        password: z.string().trim().min(8),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar vendedor.");

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      active: true,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "seller" }, { onConflict: "user_id,role" });
    if (rErr) throw new Error(rErr.message);

    return { id: created.user.id };
  });

export const resetSellerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().trim().min(8) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        name: z.string().trim().min(2),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().trim().optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!current) throw new Error("Vendedor não encontrado.");

    if (current.email !== data.email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: data.email,
        email_confirm: true,
      });
      if (authErr) throw new Error(authErr.message);
    }

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ name: data.name, email: data.email, phone: data.phone || null })
      .eq("id", data.userId);
    if (pErr) throw new Error(pErr.message);

    return { ok: true };
  });

export const deleteSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: proposalsCount, error: propErr }, { count: simsCount, error: simErr }] = await Promise.all([
      supabaseAdmin.from("proposals").select("id", { count: "exact", head: true }).eq("seller_id", data.userId),
      supabaseAdmin.from("simulations").select("id", { count: "exact", head: true }).eq("seller_id", data.userId),
    ]);
    if (propErr) throw new Error(propErr.message);
    if (simErr) throw new Error(simErr.message);

    if ((proposalsCount ?? 0) > 0 || (simsCount ?? 0) > 0) {
      throw new Error(
        "Este vendedor tem simulações ou propostas registradas. Excluir apagaria esse histórico " +
          'permanentemente (a tabela de propostas está ligada ao login do vendedor). Use "Desativar" ' +
          "para revogar o acesso sem perder os dados.",
      );
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) throw new Error(authErr.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    return { ok: true };
  });

export const setSellerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ active: data.active })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Bloqueia o acesso sem apagar o histórico do vendedor
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h",
    });
    return { ok: true };
  });
