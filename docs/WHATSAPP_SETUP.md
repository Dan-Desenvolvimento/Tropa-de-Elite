# Configuração do disparo de WhatsApp com link do ingresso

O sistema envia mensagens pela WhatsApp Cloud API somente para inscrições `confirmed` com `communications_consent = true`.

## 1. Modelo obrigatório na Meta

Crie um modelo de categoria **Utility/Utilidade**, idioma `pt_BR`, com:

- Cabeçalho: **Imagem** do evento, sem QR Code.
- Corpo:

```text
Olá, {{1}}!

Este é um lembrete referente à sua inscrição confirmada no evento {{2}}.

Data: {{3}}
Horário: {{4}}
Local: {{5}}
Seu ingresso individual está disponível no botão abaixo. Apresente-o na entrada do evento.
```

As variáveis enviadas são, nesta ordem:

1. Primeiro nome.
2. Nome do evento.
3. Data.
4. Horário.
5. Local e endereço.

Adicione um botão de URL dinâmica com o texto **VER MEU INGRESSO** e a base:

```text
https://tropa.filipezetech.com/ingresso/
```

O sistema envia o `ticket_token` individual como variável `{{1}}` do botão. O QR Code aparece somente na página segura do ingresso.

No disparo, o cabeçalho usa sempre a imagem pública `cabecalho-whatsapp-evento.png`. Para trocar a arte, substitua esse arquivo em `public/` e faça um novo deploy.

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

O conteúdo do corpo é controlado pelo modelo aprovado; o sistema preenche automaticamente as cinco variáveis e o botão individual.

## 4. Disparo

Em **Evento → Inscritos**, clique em **Enviar WhatsApp** e confirme. Repetir o clique não reenvia para registros já enviados ou em processamento.
