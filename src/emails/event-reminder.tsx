import {
  Body,
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

type EventReminderEmailProps = {
  logoUrl: string;
  firstName: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  address: string;
  city: string;
  ticketUrl: string;
  whatsappGroupUrl: string | null;
  supportEmail: string | null;
};

export function EventReminderEmail({
  logoUrl,
  firstName,
  eventName,
  eventDate,
  eventTime,
  venueName,
  address,
  city,
  ticketUrl,
  whatsappGroupUrl,
  supportEmail,
}: EventReminderEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Faltam poucos dias para o {eventName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Img src={logoUrl} alt="Tropa de Elite" width="220" style={styles.logo} />
          <Text style={styles.kicker}>LEMBRETE IMPORTANTE</Text>
          <Heading style={styles.heading}>Está chegando, {firstName}.</Heading>
          <Text style={styles.text}>
            Faltam apenas dois dias para o <strong>{eventName}</strong>. Sua inscrição está confirmada e esperamos você para viver essa experiência.
          </Text>
          <Section style={styles.card}>
            <Text style={styles.item}><strong>Data:</strong> {eventDate}</Text>
            <Text style={styles.item}><strong>Horário:</strong> {eventTime}</Text>
            <Text style={styles.item}><strong>Local:</strong> {venueName}</Text>
            <Text style={styles.item}><strong>Endereço:</strong> {address} — {city}</Text>
          </Section>
          <Link href={ticketUrl} style={styles.button}>ABRIR MEU INGRESSO</Link>
          {whatsappGroupUrl ? <Text style={styles.text}>Entre no grupo oficial para receber avisos: <Link href={whatsappGroupUrl} style={styles.link}>entrar no grupo</Link>.</Text> : null}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>Se precisar de ajuda, responda este e-mail{supportEmail ? ` ou fale com ${supportEmail}` : ""}.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: "#090909", fontFamily: "Arial, sans-serif", color: "#f5f5f5" },
  container: { maxWidth: "560px", margin: "0 auto", padding: "40px 24px" },
  logo: { margin: "0 auto 32px", display: "block" },
  kicker: { color: "#ef1d2f", fontSize: "12px", fontWeight: "700", letterSpacing: "2px", textAlign: "center" as const },
  heading: { fontSize: "30px", lineHeight: "1.2", textAlign: "center" as const, margin: "12px 0 20px" },
  text: { color: "#c7c7c7", fontSize: "16px", lineHeight: "1.6" },
  card: { backgroundColor: "#171315", border: "1px solid #4d1820", borderRadius: "12px", padding: "18px 22px", margin: "24px 0" },
  item: { color: "#e5e5e5", fontSize: "15px", lineHeight: "1.45", margin: "8px 0" },
  button: { display: "block", backgroundColor: "#ef101f", borderRadius: "8px", color: "#fff", fontSize: "15px", fontWeight: "700", padding: "15px 20px", textAlign: "center" as const, textDecoration: "none" },
  link: { color: "#ff5360" },
  hr: { borderColor: "#2b2b2b", margin: "30px 0 18px" },
  footer: { color: "#777", fontSize: "12px", lineHeight: "1.5", textAlign: "center" as const },
};
