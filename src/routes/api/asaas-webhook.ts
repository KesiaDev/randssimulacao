// Webhook do Asaas: confirma o pagamento da licença anual do vendedor
// autocadastrado. Configurar no painel do Asaas apontando pra
// https://<seu-dominio>/api/asaas-webhook, com o mesmo token guardado em
// ASAAS_WEBHOOK_SECRET.
import { createFileRoute } from "@tanstack/react-router";

const CONFIRMED_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/asaas-webhook")({
  server: {
    handlers: {
      // Algumas plataformas (e o próprio formulário de cadastro do Asaas)
      // fazem uma checagem simples de alcançabilidade antes de salvar a URL.
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const { verifyAsaasWebhookToken } = await import("@/integrations/asaas/client.server");
        const token = request.headers.get("asaas-access-token");
        if (!verifyAsaasWebhookToken(token)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as {
          event?: string;
          payment?: { id?: string; installment?: string };
        } | null;
        const event = body?.event;
        const payment = body?.payment;
        if (!event || !payment?.id) return new Response("ok", { status: 200 });
        if (!CONFIRMED_EVENTS.has(event)) return new Response("ok", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const match = payment.installment
          ? `asaas_payment_id.eq.${payment.id},asaas_installment_id.eq.${payment.installment}`
          : `asaas_payment_id.eq.${payment.id}`;

        const now = new Date();
        const expiresAt = new Date(now.getTime() + ONE_YEAR_MS);
        const { error } = await supabaseAdmin
          .from("licenses")
          .update({ status: "active", paid_at: now.toISOString(), expires_at: expiresAt.toISOString() })
          .or(match)
          .eq("status", "pending");

        if (error) {
          console.error("[asaas-webhook] falha ao ativar licença:", error);
          return new Response("error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
