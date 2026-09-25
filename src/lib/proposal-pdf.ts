import type { Database } from "@/integrations/supabase/types";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import randonLogo from "@/assets/randon-logo.png.asset.json";

type ItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type Input = { id: string; clientName: string | null; createdAt: string; sellerName: string; sellerPhone?: string | null; imageUrl: string; items: ItemRow[] };

type LoadedImage = { dataUrl: string; width: number; height: number; format: "JPEG" | "PNG" };

async function loadImage(url: string): Promise<LoadedImage | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    element.src = dataUrl;
  });
  return {
    dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    format: blob.type.includes("png") ? "PNG" : "JPEG",
  };
}

async function coverImageDataUrl(url: string, targetRatio: number) {
  const source = await loadImage(url);
  if (!source) return null;

  const outputWidth = 1400;
  const outputHeight = Math.round(outputWidth / targetRatio);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Não foi possível preparar a foto."));
    element.src = source.dataUrl;
  });
  const sourceRatio = source.width / source.height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = source.width;
  let sourceHeight = source.height;
  if (sourceRatio > targetRatio) {
    sourceWidth = source.height * targetRatio;
    sourceX = (source.width - sourceWidth) / 2;
  } else {
    sourceHeight = source.width / targetRatio;
    sourceY = (source.height - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function whiteImageDataUrl(source: LoadedImage | null) {
  if (!source) return null;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Não foi possível preparar a marca."));
    element.src = source.dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function createProposalPdf(input: Input) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const blue = [0, 69, 135] as const;
  const navy = [8, 39, 73] as const;
  const gray = [82, 94, 108] as const;
  const pale = [245, 248, 252] as const;
  const line = [218, 224, 232] as const;
  let y = 0;

  const logo = await loadImage(randonLogo.url).catch(() => null);
  const whiteLogo = await whiteImageDataUrl(logo).catch(() => null);
  const hero = await coverImageDataUrl(input.imageUrl, pageWidth / 64).catch(() => null);

  const drawPageBackground = () => {
    pdf.setFillColor(...pale);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  };

  const drawLogo = (x: number, top: number, maxWidth: number, maxHeight: number, white = false) => {
    if (!logo) return;
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
    pdf.addImage(white && whiteLogo ? whiteLogo : logo.dataUrl, white && whiteLogo ? "PNG" : logo.format, x, top, logo.width * scale, logo.height * scale, undefined, "FAST");
  };

  const nextPage = () => {
    pdf.addPage();
    drawPageBackground();
    pdf.setFillColor(...navy);
    pdf.rect(0, 0, pageWidth, 24, "F");
    drawLogo(margin, 7, 52, 10, true);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("PROPOSTA COMERCIAL", pageWidth - margin, 14, { align: "right" });
    y = 34;
  };

  const ensureSpace = (height: number) => {
    if (y + height > 272) nextPage();
  };

  drawPageBackground();
  if (hero) {
    pdf.addImage(hero, "JPEG", 0, 0, pageWidth, 64, undefined, "FAST");
  } else {
    pdf.setFillColor(...blue);
    pdf.rect(0, 0, pageWidth, 64, "F");
  }
  pdf.setFillColor(...navy);
  pdf.rect(0, 32, pageWidth, 32, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin - 3, 7, 68, 19, 2, 2, "F");
  drawLogo(margin, 11, 62, 11);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("PROPOSTA COMERCIAL", margin, 40);
  pdf.setFontSize(20);
  pdf.text("Uma composição sob medida", margin, 49);
  pdf.text("para movimentar o seu negócio.", margin, 57);
  pdf.setFontSize(8);
  pdf.text(formatDate(input.createdAt), pageWidth - margin, 18, { align: "right" });

  y = 77;
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("PREPARADA PARA", margin, y);
  pdf.setTextColor(...navy);
  pdf.setFontSize(16);
  const clientLines = pdf.splitTextToSize(input.clientName || "Cliente Randon", contentWidth);
  pdf.text(clientLines.slice(0, 2), margin, y + 8);
  y += 12 + Math.min(clientLines.length, 2) * 6;
  pdf.setDrawColor(...line);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  let totalQuantity = 0;
  let totalCredit = 0;
  let totalMonthly = 0;
  let totalInsurance = 0;
  input.items.forEach((item, index) => {
    ensureSpace(53);
    const quantity = item.quantity;
    totalQuantity += quantity;
    totalCredit += Number(item.credit_value) * quantity;
    totalMonthly += Number(item.final_amount) * quantity;
    totalInsurance += Number(item.insurance_amount) * quantity;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...line);
    pdf.roundedRect(margin, y, contentWidth, 49, 2, 2, "FD");
    pdf.setFillColor(...blue);
    pdf.roundedRect(margin, y, 4, 49, 2, 2, "F");
    pdf.setTextColor(...gray);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text(`ITEM ${index + 1}`, margin + 8, y + 7);
    pdf.setTextColor(...navy);
    pdf.setFontSize(13);
    pdf.text(`Grupo ${item.group_code}`, margin + 8, y + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const description = `${item.installment_type_name}  •  Taxa ${formatPercent(Number(item.administration_rate))}  •  ${item.insurance_included ? "Seguro incluído" : "Sem seguro"}`;
    pdf.text(description, margin + 8, y + 20);

    const firstLabels = ["QUANTIDADE", "CRÉDITO POR COTA", "CRÉDITO TOTAL"];
    const firstValues = [`${quantity} ${quantity === 1 ? "cota" : "cotas"}`, formatBRL(Number(item.credit_value)), formatBRL(Number(item.credit_value) * quantity)];
    const secondLabels = ["PARCELA POR COTA", "PARCELA TOTAL / MÊS", "PRAZO"];
    const secondValues = [formatBRL(Number(item.final_amount)), formatBRL(Number(item.final_amount) * quantity), `${item.initial_term} meses · ${item.remaining_term} restantes`];
    [firstLabels, secondLabels].forEach((labels, row) => {
      labels.forEach((label, column) => {
        const x = margin + 8 + column * 56;
        const rowY = y + 28 + row * 12;
        pdf.setTextColor(...gray);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(5.8);
        pdf.text(label, x, rowY);
        pdf.setTextColor(...navy);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.3);
        pdf.text((row === 0 ? firstValues : secondValues)[column] ?? "", x, rowY + 5);
      });
    });
    y += 54;
  });

  ensureSpace(52);
  pdf.setFillColor(...blue);
  pdf.roundedRect(margin, y, contentWidth, 35, 2, 2, "F");
  pdf.setTextColor(210, 229, 248);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("TOTAL DA PROPOSTA", margin + 7, y + 9);
  const labels = ["QUANTIDADE TOTAL", "CRÉDITO TOTAL", "PARCELA TOTAL/MÊS"];
  const values = [`${totalQuantity} ${totalQuantity === 1 ? "cota" : "cotas"}`, formatBRL(totalCredit), formatBRL(totalMonthly)];
  labels.forEach((label, column) => {
    const x = margin + 7 + column * 57;
    pdf.setTextColor(190, 217, 244);
    pdf.setFontSize(6.2);
    pdf.text(label, x, y + 19);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text(values[column] ?? "", x, y + 27);
  });
  if (totalInsurance > 0) {
    pdf.setTextColor(210, 229, 248);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(`Seguro incluído no total mensal: ${formatBRL(totalInsurance)}`, margin + 7, y + 35);
  }

  y += 43;
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.text("CONSULTOR", margin, y);
  pdf.setTextColor(...navy);
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(input.sellerName || "Equipe Randon", 72).slice(0, 1), margin, y + 7);
  if (input.sellerPhone) {
    pdf.setTextColor(...gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(input.sellerPhone, margin, y + 13);
  }
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.8);
  const legal = "Esta proposta é informativa. Valores sujeitos às condições, disponibilidade e regras vigentes dos grupos.";
  pdf.text(pdf.splitTextToSize(legal, 82), pageWidth - margin, y, { align: "right" });

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...line);
    pdf.line(margin, 281, pageWidth - margin, 281);
    pdf.setTextColor(...gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text("Simulação de Consórcios Randon", margin, 287);
    pdf.text(`Proposta ${input.id.slice(0, 8).toUpperCase()}  •  Página ${page} de ${totalPages}`, pageWidth - margin, 287, { align: "right" });
  }

  const safeClient = (input.clientName || "cliente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return { blob: pdf.output("blob"), filename: `proposta-randon-${safeClient || input.id.slice(0, 8)}.pdf` };
}
