export type PublicTicket = {
  registrationId: string;
  participantName: string;
  status: "confirmed" | "waitlist" | "cancelled";
  ticketCode: string;
  ticketToken: string;
  checkedInAt: string | null;
  event: {
    id: string;
    name: string;
    slug: string;
    startAt: string;
    timezone: string;
    venueName: string;
    address: string;
    city: string;
    whatsappGroupUrl: string | null;
    supportEmail: string | null;
  };
};
