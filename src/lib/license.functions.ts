// Ações do próprio vendedor sobre a sua licença (diferente de
// team.functions.ts, que é só pra admin agir sobre outros vendedores).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ANNUAL_LICENSE_VALUE = 500;
const INSTALLMENT_COUNT = 12;

export const generateLicenseCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findOrCreateAsaasCustomer, createCardInstallmentCharge } = await import(
      "@/integrations/asaas/client.server"
    );

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("name, email, phone, cpf, self_registered")
      .eq("id", context.userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error("Perfil não encontrado.");
    if (!profile.self_registered) throw new Error("Esta conta não usa licença individual.");
    if (!profile.cpf) throw new Error("CPF não cadastrado — fale com o suporte.");

    const customer = await findOrCreateAsaasCustomer({
      name: profile.name,
      email: profile.email,
      cpfCnpj: profile.cpf,
      phone: profile.phone,
    });
    const charge = await createCardInstallmentCharge({
      customerId: customer.id,
      totalValue: ANNUAL_LICENSE_VALUE,
      installmentCount: INSTALLMENT_COUNT,
      description: "Licença Anual simulação Consórcio",
    });

    const { error: lErr } = await supabaseAdmin.from("licenses").insert({
      seller_id: context.userId,
      status: "pending",
      asaas_customer_id: customer.id,
      asaas_payment_id: charge.id,
      asaas_installment_id: charge.installment ?? null,
    });
    if (lErr) throw new Error(lErr.message);

    return { invoiceUrl: charge.invoiceUrl };
  });
