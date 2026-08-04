import "server-only";

import QRCode from "qrcode";

import { ticketQrPayload } from "@/features/tickets/qr-payload";

export async function createTicketQrDataUrl(token: string) {
  return QRCode.toDataURL(ticketQrPayload(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
    color: { dark: "#08080a", light: "#ffffff" },
  });
}

export async function createTicketQrBuffer(token: string) {
  return QRCode.toBuffer(ticketQrPayload(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
    type: "png",
    color: { dark: "#08080a", light: "#ffffff" },
  });
}
