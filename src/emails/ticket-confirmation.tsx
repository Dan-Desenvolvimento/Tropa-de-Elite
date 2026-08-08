import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

type TicketConfirmationEmailProps = {
  logoUrl: string;
  firstName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  address: string;
  city: string;
  ticketCode: string;
  ticketUrl: string;
  whatsappGroupUrl: string | null;
  supportEmail: string | null;
};

export function TicketConfirmationEmail({
  logoUrl,
  firstName,
  eventName,
  eventDate,
  eventTime,
  venueName,
  address,
  city,
  ticketCode,
  ticketUrl,
  whatsappGroupUrl,
  supportEmail,
}: TicketConfirmationEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Inscrição confirmada — {eventName}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandSection}>
            <Img src={logoUrl} width="220" height="55" alt="Tropa de Elite" style={brandLogo} />
            <Text style={eyebrow}>TROPA DE ELITE</Text>
            <Heading style={title}>Inscrição confirmada.</Heading>
            <Text style={intro}>Olá, {firstName}. Sua participação em {eventName} está garantida.</Text>
          </Section>

          <Section style={contentSection}>
            <Heading as="h2" style={eventTitle}>{eventName}</Heading>
            <Text style={detail}><strong>Data:</strong> {eventDate}</Text>
            <Text style={detail}><strong>Horário:</strong> {eventTime}</Text>
            <Text style={detail}><strong>Local:</strong> {venueName}</Text>
            <Text style={detail}><strong>Endereço:</strong> {address} · {city}</Text>

            <Section style={qrSection}>
              <Img
                src="cid:ticket-qr"
                width="220"
                height="220"
                alt={`QR Code do ingresso ${ticketCode}`}
                style={qrImage}
              />
              <Text style={ticketCodeStyle}>{ticketCode}</Text>
            </Section>

            <Button href={ticketUrl} style={primaryButton}>Abrir meu ingresso</Button>
            {whatsappGroupUrl ? (
              <Button href={whatsappGroupUrl} style={secondaryButton}>Entrar no grupo oficial</Button>
            ) : null}

            <Hr style={divider} />
            <Text style={notice}>
              Apresente o QR Code na entrada. O ingresso é individual e não deve ser compartilhado.
            </Text>
            <Text style={notice}>
              Seus dados são utilizados apenas para a organização e comunicação deste evento.
            </Text>
            {supportEmail ? (
              <Text style={notice}>
                Precisa de ajuda? <Link href={`mailto:${supportEmail}`} style={link}>{supportEmail}</Link>
              </Text>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#050506", fontFamily: "Arial, sans-serif", margin: 0, padding: "32px 12px" };
const container = { backgroundColor: "#111114", border: "1px solid #28282d", borderRadius: "24px", maxWidth: "600px", overflow: "hidden" };
const brandSection = { backgroundColor: "#19090b", padding: "36px 36px 28px" };
const brandLogo = { display: "block", height: "55px", margin: "0 0 24px", maxWidth: "220px", width: "220px" };
const contentSection = { padding: "32px 36px" };
const eyebrow = { color: "#ef3039", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", margin: "0 0 14px" };
const title = { color: "#ffffff", fontSize: "34px", lineHeight: "1.15", margin: "0" };
const intro = { color: "#b5b5bd", fontSize: "16px", lineHeight: "1.6", margin: "16px 0 0" };
const eventTitle = { color: "#ffffff", fontSize: "24px", margin: "0 0 22px" };
const detail = { color: "#c9c9cf", fontSize: "15px", lineHeight: "1.55", margin: "7px 0" };
const qrSection = { backgroundColor: "#ffffff", borderRadius: "18px", margin: "28px auto", padding: "18px", textAlign: "center" as const, width: "256px" };
const qrImage = { display: "block", margin: "0 auto" };
const ticketCodeStyle = { color: "#111114", fontFamily: "monospace", fontSize: "16px", fontWeight: "700", letterSpacing: "2px", margin: "10px 0 0" };
const primaryButton = { backgroundColor: "#e31620", borderRadius: "10px", color: "#ffffff", display: "block", fontSize: "14px", fontWeight: "700", margin: "0 0 12px", padding: "15px 24px", textAlign: "center" as const, textDecoration: "none" };
const secondaryButton = { border: "1px solid #3c3c43", borderRadius: "10px", color: "#ffffff", display: "block", fontSize: "14px", fontWeight: "700", margin: "0", padding: "14px 24px", textAlign: "center" as const, textDecoration: "none" };
const divider = { borderColor: "#2a2a30", margin: "30px 0" };
const notice = { color: "#8f8f98", fontSize: "13px", lineHeight: "1.55", margin: "8px 0" };
const link = { color: "#ef5159" };

TicketConfirmationEmail.PreviewProps = {
  logoUrl: "https://tropa.filipezetech.com/Tropa-de-elite-branca-para-fundo-preto.png",
  firstName: "Daniel",
  eventName: "Tropa de Elite",
  eventDate: "16 de agosto de 2026",
  eventTime: "08:00",
  venueName: "Auditório FZ Holding",
  address: "Rua Cuiabá, 42 — Bairro Brasil",
  city: "Vitória da Conquista — BA",
  ticketCode: "TDE-8F4K2D",
  ticketUrl: "https://tropa.filipezetech.com/ingresso/exemplo",
  whatsappGroupUrl: null,
  supportEmail: "equipadodanmkt@gmail.com",
} satisfies TicketConfirmationEmailProps;
