import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicTicket } from "@/features/tickets/types";
import { TicketCard } from "./ticket-card";

afterEach(cleanup);

const baseTicket: PublicTicket = {
  registrationId: "registration-id",
  participantName: "Participante Teste",
  status: "confirmed",
  ticketCode: "TDE-ABC123",
  ticketToken: "token-with-at-least-thirty-two-characters",
  checkedInAt: null,
  event: {
    id: "event-id",
    name: "Tropa de Elite",
    slug: "tropa-de-elite",
    startAt: "2026-08-16T11:00:00.000Z",
    timezone: "America/Bahia",
    venueName: "FZ Espaço de Eventos",
    address: "Vitória da Conquista",
    city: "Vitória da Conquista - BA",
    whatsappGroupUrl: "https://chat.whatsapp.com/example",
    supportEmail: "suporte@example.com",
  },
};

describe("TicketCard", () => {
  it("exibe QR e ações do ingresso somente para inscrição confirmada", () => {
    render(<TicketCard ticket={baseTicket} qrDataUrl="data:image/png;base64,qr" />);

    expect(screen.getByRole("img", { name: /QR Code do ingresso/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Salvar ingresso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Entrar no grupo oficial/i })).toBeInTheDocument();
  });

  it("não apresenta QR ou grupo para participante na lista de espera", () => {
    render(<TicketCard ticket={{ ...baseTicket, status: "waitlist" }} qrDataUrl={null} showSuccess />);

    expect(screen.getByRole("heading", { name: "Lista de espera" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR Code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Salvar ingresso" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Entrar no grupo oficial/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Sua vaga ainda não está confirmada/i)).toBeInTheDocument();
  });
});
