// Autocadastro público de vendedor (sem autenticação prévia) — diferente de
// team.functions.ts, que exige admin logado. Cria conta, cobra a licença
// anual no Asaas e devolve o link de checkout pro navegador redirecionar.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isValidCpf } from "@/lib/cpf";

const ANNUAL_LICENSE_VALUE = 500;
const INSTALLMENT_COUNT = 12;

export const registerSeller = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().trim().optional().default(""),
        cpf: z.string().trim().refine(isValidCpf, "CPF inválido"),
        password: z.string().trim().min(8),
        dealerId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findOrCreateAsaasCustomer, createCardInstallmentCharge } = await import(
      "@/integrations/asaas/client.server"
    );

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar cadastro.");
    const userId = created.user.id;

    const cleanupAndThrow = async (message: string): Promise<never> => {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw new Error(message);
    };

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      cpf: data.cpf.replace(/\D/g, ""),
      dealer_id: data.dealerId,
      self_registered: true,
      active: true,
    });
    if (pErr) return cleanupAndThrow(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "seller" }, { onConflict: "user_id,role" });
    if (rErr) return cleanupAndThrow(rErr.message);

    try {
      const customer = await findOrCreateAsaasCustomer({
        name: data.name,
        email: data.email,
        cpfCnpj: data.cpf,
        phone: data.phone || null,
      });
      const charge = await createCardInstallmentCharge({
        customerId: customer.id,
        totalValue: ANNUAL_LICENSE_VALUE,
        installmentCount: INSTALLMENT_COUNT,
        description: "Licença Anual simulação Consórcio",
      });

      const { error: lErr } = await supabaseAdmin.from("licenses").insert({
        seller_id: userId,
        status: "pending",
        asaas_customer_id: customer.id,
        asaas_payment_id: charge.id,
        asaas_installment_id: charge.installment ?? null,
      });
      if (lErr) return cleanupAndThrow(lErr.message);

      return { invoiceUrl: charge.invoiceUrl };
    } catch (asaasError) {
      return cleanupAndThrow(
        asaasError instanceof Error
          ? `Não foi possível gerar a cobrança: ${asaasError.message}`
          : "Não foi possível gerar a cobrança da licença.",
      );
    }
  });
