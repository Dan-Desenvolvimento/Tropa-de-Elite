# Configuração do disparo de WhatsApp com QR Code

O sistema envia mensagens pela WhatsApp Cloud API somente para inscrições `confirmed` com `communications_consent = true`.

## 1. Modelo obrigatório na Meta

Crie um modelo de categoria **Utility/Utilidade**, idioma `pt_BR`, com:

- Cabeçalho: **Imagem**.
- Corpo:

```text
Olá, {{1}}!

{{2}}

Evento: {{3}}
Data: {{4}}
Horário: {{5}}
Local: {{6}}
Código do ingresso: {{7}}

Apresente o QR Code desta mensagem na entrada.
```

As variáveis enviadas são, nesta ordem:

1. Primeiro nome.
2. Texto editável no evento.
3. Nome do evento.
4. Data.
5. Horário.
6. Local e endereço.
7. Código do ingresso.

O QR Code individual é enviado como imagem do cabeçalho.

## 2. Variáveis da Vercel

Configure em Production e faça novo deploy:

```text
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_API_VERSION
```

Use a versão vigente da Graph API exibida no painel Meta. Nunca coloque o token no editor do evento ou no repositório.

## 3. Editor do evento

Em **Evento → Comunicação**, informe:

- Nome técnico exato do modelo aprovado.
- Idioma, normalmente `pt_BR`.
- Mensagem editável do lembrete.

## 4. Disparo

Em **Evento → Inscritos**, clique em **Enviar WhatsApp com QR** e confirme. Repetir o clique não reenvia para registros já enviados ou em processamento.
