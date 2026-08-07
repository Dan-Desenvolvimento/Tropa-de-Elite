import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

type StaffInvitationEmailProps = {
  firstName: string;
  roleLabel: string;
  inviteUrl: string;
};

export function StaffInvitationEmail({
  firstName,
  roleLabel,
  inviteUrl,
}: StaffInvitationEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Você foi convidado para a equipe Tropa de Elite</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>TROPA DE ELITE</Text>
            <Heading style={title}>Você faz parte da equipe.</Heading>
          </Section>
          <Section style={content}>
            <Text style={paragraph}>Olá, {firstName}.</Text>
            <Text style={paragraph}>
              Você recebeu acesso como <strong>{roleLabel}</strong>. Use o botão abaixo para confirmar o convite e definir sua senha.
            </Text>
            <Button href={inviteUrl} style={button}>Aceitar convite</Button>
            <Text style={notice}>
              Este link é individual. Se você não esperava este convite, ignore esta mensagem.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#050506", fontFamily: "Arial, sans-serif", margin: 0, padding: "32px 12px" };
const container = { backgroundColor: "#111114", border: "1px solid #28282d", borderRadius: "24px", maxWidth: "560px", overflow: "hidden" };
const header = { backgroundColor: "#19090b", padding: "36px" };
const content = { padding: "32px 36px" };
const eyebrow = { color: "#ef3039", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", margin: "0 0 14px" };
const title = { color: "#ffffff", fontSize: "32px", lineHeight: "1.15", margin: 0 };
const paragraph = { color: "#c9c9cf", fontSize: "15px", lineHeight: "1.65", margin: "0 0 16px" };
const button = { backgroundColor: "#e31620", borderRadius: "10px", color: "#ffffff", display: "block", fontSize: "14px", fontWeight: "700", margin: "26px 0", padding: "15px 24px", textAlign: "center" as const, textDecoration: "none" };
const notice = { color: "#85858e", fontSize: "12px", lineHeight: "1.55", margin: 0 };

StaffInvitationEmail.PreviewProps = {
  firstName: "Mariana",
  roleLabel: "operador de check-in",
  inviteUrl: "https://tropa.filipezetech.com/auth/confirm?token_hash=exemplo&type=invite",
} satisfies StaffInvitationEmailProps;

