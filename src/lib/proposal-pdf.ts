import type { Database } from "@/integrations/supabase/types";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import randonLogo from "@/assets/randon-logo.png.asset.json";

type ItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type Input = { id: string; clientName: string | null; createdAt: string; sellerName: string; sellerPhone?: string | null; imageUrls: string[]; items: ItemRow[] };

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
  const heroes = await Promise.all(input.imageUrls.map((url) => loadImage(url).catch(() => null)));

  const drawPageBackground = () => {
    pdf.setFillColor(...pale);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  };

  const drawLogo = (x: number, top: number, maxWidth: number, maxHeight: number, white = false) => {
    if (!logo) return;
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
    pdf.addImage(white && whiteLogo ? whiteLogo : logo.dataUrl, white && whiteLogo ? "PNG" : logo.format, x, top, logo.width * scale, logo.height * scale, undefined, "FAST");
  };

  const drawCoverPhoto = (photo: LoadedImage, top: number, height: number) => {
    const scale = Math.max(pageWidth / photo.width, height / photo.height);
    const width = photo.width * scale;
    const renderedHeight = photo.height * scale;
    const x = (pageWidth - width) / 2;
    const imageTop = top + (height - renderedHeight) / 2;

    pdf.saveGraphicsState();
    pdf.rect(0, top, pageWidth, height);
    pdf.clip();
    pdf.discardPath();
    pdf.addImage(photo.dataUrl, photo.format, x, imageTop, width, renderedHeight, undefined, "FAST");
    pdf.restoreGraphicsState();
  };

  const drawPhotoHeader = (pageIndex: number, firstPage = false) => {
    drawPageBackground();
    const hero = heroes[pageIndex % Math.max(heroes.length, 1)] ?? null;
    const photoHeight = firstPage ? 72 : 58;
    pdf.setFillColor(232, 237, 243);
    pdf.rect(0, 0, pageWidth, photoHeight, "F");
    if (hero) {
      drawCoverPhoto(hero, 0, photoHeight);
    } else {
      pdf.setFillColor(...blue);
      pdf.rect(0, 0, pageWidth, photoHeight, "F");
    }
    pdf.setFillColor(...navy);
    pdf.rect(0, photoHeight, pageWidth, firstPage ? 29 : 18, "F");
    if (firstPage) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin - 3, 7, 72, 20, 2, 2, "F");
      drawLogo(margin, 11, 66, 11);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - margin - 27, 8, 30, 10, 2, 2, "F");
      pdf.setTextColor(...gray);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text(formatDate(input.createdAt), pageWidth - margin - 12, 14.5, { align: "center" });
    } else {
      drawLogo(margin, photoHeight + 4.5, 48, 8.5, true);
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    if (firstPage) {
      pdf.setFontSize(8.5);
      pdf.text("PROPOSTA COMERCIAL", margin, photoHeight + 8);
      pdf.setFontSize(17.5);
      pdf.text("Uma composição sob medida para", margin, photoHeight + 17);
      pdf.text("movimentar o seu negócio.", margin, photoHeight + 25);
    } else {
      pdf.setFontSize(8.5);
      pdf.text("PROPOSTA COMERCIAL", pageWidth - margin, photoHeight + 11.5, { align: "right" });
    }
  };

  const nextPage = () => {
    pdf.addPage();
    drawPhotoHeader(pdf.getNumberOfPages() - 1);
    y = 84;
  };

  const ensureSpace = (height: number) => {
    if (y + height > 278) nextPage();
  };

  drawPhotoHeader(0, true);

  y = 111;
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("PREPARADA PARA", margin, y);
  pdf.setTextColor(...navy);
  pdf.setFontSize(18);
  const clientLines = pdf.splitTextToSize(input.clientName || "Cliente Randon", contentWidth);
  pdf.text(clientLines.slice(0, 2), margin, y + 8);
  y += 13 + Math.min(clientLines.length, 2) * 7;
  pdf.setDrawColor(...line);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  let totalQuantity = 0;
  let totalCredit = 0;
  let totalMonthly = 0;
  let totalInsurance = 0;
  input.items.forEach((item, index) => {
    const isLastItem = index === input.items.length - 1;
    // Keep the closing item, totals and consultant together when they do not fit.
    ensureSpace(isLastItem ? 126 : 65);
    const quantity = item.quantity;
    totalQuantity += quantity;
    totalCredit += Number(item.credit_value) * quantity;
    totalMonthly += Number(item.final_amount) * quantity;
    totalInsurance += Number(item.insurance_amount) * quantity;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...line);
    pdf.roundedRect(margin, y, contentWidth, 60, 2, 2, "FD");
    pdf.setFillColor(...blue);
    pdf.roundedRect(margin, y, 4, 60, 2, 2, "F");
    pdf.setTextColor(...gray);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(`ITEM ${index + 1}`, margin + 9, y + 8);
    pdf.setTextColor(...navy);
    pdf.setFontSize(15);
    pdf.text(`Grupo ${item.group_code}`, margin + 9, y + 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    const description = `${item.installment_type_name}  •  Taxa ${formatPercent(Number(item.administration_rate))}  •  ${item.insurance_included ? "Seguro incluído" : "Sem seguro"}`;
    const descriptionLines = pdf.splitTextToSize(description, contentWidth - 18);
    pdf.text(descriptionLines.slice(0, 1), margin + 9, y + 23);

    const firstLabels = ["QUANTIDADE", "CRÉDITO POR COTA", "CRÉDITO TOTAL"];
    const firstValues = [`${quantity} ${quantity === 1 ? "cota" : "cotas"}`, formatBRL(Number(item.credit_value)), formatBRL(Number(item.credit_value) * quantity)];
    const secondLabels = ["PARCELA POR COTA", "PARCELA TOTAL / MÊS", "PRAZO"];
    const secondValues = [formatBRL(Number(item.final_amount)), formatBRL(Number(item.final_amount) * quantity), `${item.initial_term} meses · ${item.remaining_term} restantes`];
    [firstLabels, secondLabels].forEach((labels, row) => {
      labels.forEach((label, column) => {
        const x = margin + 9 + column * 56;
        const rowY = y + 32 + row * 13;
        pdf.setTextColor(...gray);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.6);
        pdf.text(label, x, rowY);
        pdf.setTextColor(...navy);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.8);
        pdf.text((row === 0 ? firstValues : secondValues)[column] ?? "", x, rowY + 5.5);
      });
    });
    y += 65;
  });

  const totalsHeight = totalInsurance > 0 ? 42 : 38;
  ensureSpace(totalsHeight + 24);
  pdf.setFillColor(...blue);
  pdf.roundedRect(margin, y, contentWidth, totalsHeight, 2, 2, "F");
  pdf.setTextColor(210, 229, 248);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("TOTAL DA PROPOSTA", margin + 8, y + 10);
  const labels = ["QUANTIDADE TOTAL", "CRÉDITO TOTAL", "PARCELA TOTAL/MÊS"];
  const values = [`${totalQuantity} ${totalQuantity === 1 ? "cota" : "cotas"}`, formatBRL(totalCredit), formatBRL(totalMonthly)];
  labels.forEach((label, column) => {
    const x = margin + 8 + column * 57;
    pdf.setTextColor(190, 217, 244);
    pdf.setFontSize(6.8);
    pdf.text(label, x, y + 21);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11.5);
    pdf.text(values[column] ?? "", x, y + 30);
  });
  if (totalInsurance > 0) {
    pdf.setTextColor(210, 229, 248);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.text(`Seguro incluído no total mensal: ${formatBRL(totalInsurance)}`, margin + 8, y + 39);
  }

  y += totalsHeight + 8;
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.text("CONSULTOR", margin, y);
  pdf.setTextColor(...navy);
  pdf.setFontSize(11.5);
  pdf.text(pdf.splitTextToSize(input.sellerName || "Equipe Randon", 72).slice(0, 1), margin, y + 7);
  if (input.sellerPhone) {
    pdf.setTextColor(...gray);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(input.sellerPhone, margin, y + 13);
  }
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
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
