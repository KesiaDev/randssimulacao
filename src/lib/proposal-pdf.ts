import type { Database } from "@/integrations/supabase/types";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";

type ItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type Input = { id: string; clientName: string | null; createdAt: string; sellerName: string; sellerPhone?: string | null; imageUrl: string; items: ItemRow[] };

async function imageDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function createProposalPdf(input: Input) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = 210, pageHeight = 297, margin = 16;
  const blue = [0, 69, 135] as const, navy = [10, 42, 78] as const, gray = [86, 98, 112] as const;
  let y = 0;

  const footer = () => {
    pdf.setDrawColor(218, 224, 232); pdf.line(margin, 282, pageWidth - margin, 282);
    pdf.setFontSize(7.5); pdf.setTextColor(...gray);
    pdf.text("Ferramenta interna de simulação · Valores sujeitos às condições e regras vigentes dos grupos.", margin, 288);
  };
  const nextPage = () => {
    footer(); pdf.addPage(); pdf.setFillColor(245, 248, 252); pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("RANDON CONSÓRCIOS", margin, 18); y = 28;
  };

  pdf.setFillColor(245, 248, 252); pdf.rect(0, 0, pageWidth, pageHeight, "F");
  const hero = await imageDataUrl(input.imageUrl).catch(() => null);
  if (hero) pdf.addImage(hero, "JPEG", 0, 0, pageWidth, 55, undefined, "FAST");
  pdf.setFillColor(...navy); pdf.rect(0, 55, pageWidth, 31, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text("CONSÓRCIO NACIONAL", margin, 65);
  pdf.setFontSize(21); pdf.text("RANDON", margin, 76);
  pdf.setFontSize(12); pdf.text("PROPOSTA COMERCIAL", 136, 70);

  y = 99; pdf.setTextColor(...gray); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  pdf.text("PREPARADA PARA", margin, y); pdf.text("DATA", 160, y);
  pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
  pdf.text(input.clientName || "Cliente Randon", margin, y + 8); pdf.setFontSize(10); pdf.text(formatDate(input.createdAt), 160, y + 8); y += 20;

  let totalQuantity = 0, totalCredit = 0, totalMonthly = 0;
  input.items.forEach((item, index) => {
    if (y + 47 > 276) nextPage();
    const quantity = item.quantity;
    totalQuantity += quantity; totalCredit += Number(item.credit_value) * quantity; totalMonthly += Number(item.final_amount) * quantity;
    pdf.setFillColor(255, 255, 255); pdf.setDrawColor(218, 224, 232); pdf.roundedRect(margin, y, pageWidth - margin * 2, 43, 2, 2, "FD");
    pdf.setTextColor(...gray); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(`ITEM ${index + 1}`, margin + 5, y + 7);
    pdf.setTextColor(...navy); pdf.setFontSize(14); pdf.text(`Grupo ${item.group_code}`, margin + 5, y + 15);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text(`${item.installment_type_name} · Taxa ${formatPercent(Number(item.administration_rate))} · ${item.insurance_included ? "Com seguro" : "Sem seguro"}`, margin + 5, y + 21);
    const labels = ["QUANTIDADE", "CRÉDITO/COTA", "CRÉDITO TOTAL", "PARCELA TOTAL/MÊS"];
    const values = [String(quantity), formatBRL(Number(item.credit_value)), formatBRL(Number(item.credit_value) * quantity), formatBRL(Number(item.final_amount) * quantity)];
    labels.forEach((label, column) => { const x = margin + 5 + column * 43; pdf.setTextColor(...gray); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.text(label, x, y + 30); pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(values[column] ?? "", x, y + 37); });
    y += 48;
  });

  if (y + 47 > 276) nextPage();
  pdf.setFillColor(...blue); pdf.roundedRect(margin, y, pageWidth - margin * 2, 36, 2, 2, "F");
  pdf.setTextColor(210, 229, 248); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.text("TOTAL DA PROPOSTA", margin + 6, y + 8);
  const labels = ["QUANTIDADE TOTAL", "CRÉDITO TOTAL", "PARCELA TOTAL/MÊS"];
  const values = [`${totalQuantity} ${totalQuantity === 1 ? "cota" : "cotas"}`, formatBRL(totalCredit), formatBRL(totalMonthly)];
  labels.forEach((label, column) => { const x = margin + 6 + column * 58; pdf.setTextColor(190, 217, 244); pdf.setFontSize(6.5); pdf.text(label, x, y + 18); pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.text(values[column] ?? "", x, y + 26); });
  y += 47; pdf.setTextColor(...gray); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text("CONSULTOR", margin, y);
  pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.text(input.sellerName || "Equipe Randon", margin, y + 7);
  if (input.sellerPhone) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(input.sellerPhone, margin, y + 13); }
  footer();

  const safeClient = (input.clientName || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return { blob: pdf.output("blob"), filename: `proposta-randon-${safeClient || input.id.slice(0, 8)}.pdf` };
}
