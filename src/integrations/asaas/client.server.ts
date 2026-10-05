// Cliente server-only do Asaas. Nunca importar este arquivo de um componente
// ou rota de UI — a chave de API só pode viver no servidor.
// Variáveis de ambiente esperadas:
//   ASAAS_API_KEY        — chave de API do Asaas (sandbox ou produção)
//   ASAAS_API_URL         — opcional, default aponta pra produção
//   ASAAS_WEBHOOK_SECRET — token que o Asaas envia de volta no webhook

const DEFAULT_BASE_URL = "https://api.asaas.com/v3";

function getBaseUrl(): string {
  return process.env["ASAAS_API_URL"] || DEFAULT_BASE_URL;
}

function getApiKey(): string {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) {
    throw new Error("ASAAS_API_KEY não configurada. Adicione o secret no Lovable antes de usar pagamentos.");
  }
  return key;
}

async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RandonConsorciosSimulador/1.0",
      access_token: getApiKey(),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (body as { errors?: Array<{ description?: string }> } | null)?.errors
      ?.map((e) => e.description)
      .filter(Boolean)
      .join("; ");
    throw new Error(message || `Asaas respondeu ${response.status}`);
  }
  return body as T;
}

export interface AsaasCustomer {
  id: string;
}

export async function findOrCreateAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string | null;
}): Promise<AsaasCustomer> {
  const digits = input.cpfCnpj.replace(/\D/g, "");
  const existing = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(digits)}`,
  );
  if (existing.data[0]) return existing.data[0];

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: digits,
      phone: input.phone || undefined,
    }),
  });
}

export interface AsaasInstallmentPayment {
  id: string;
  installment?: string;
  invoiceUrl: string;
}

/**
 * Cria uma cobrança única no cartão de crédito, parcelada sem juros.
 * O Asaas gera uma página de checkout hospedada (`invoiceUrl`) onde o
 * próprio cliente digita os dados do cartão — não coletamos cartão aqui.
 */
export async function createCardInstallmentCharge(input: {
  customerId: string;
  totalValue: number;
  installmentCount: number;
  description: string;
}): Promise<AsaasInstallmentPayment> {
  const dueDate = new Date().toISOString().slice(0, 10);
  return asaasFetch<AsaasInstallmentPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "CREDIT_CARD",
      totalValue: input.totalValue,
      installmentCount: input.installmentCount,
      dueDate,
      description: input.description,
    }),
  });
}

export function verifyAsaasWebhookToken(headerToken: string | null): boolean {
  const expected = process.env["ASAAS_WEBHOOK_SECRET"];
  if (!expected) return false;
  return headerToken === expected;
}
