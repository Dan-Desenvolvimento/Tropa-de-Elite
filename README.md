# Tropa de Elite — Inscrições e Check-in

Sistema de produção para criar eventos, receber inscrições, emitir ingressos com QR Code e controlar entradas por scanner ou busca manual.

## Tecnologias

- Next.js 16 com App Router e TypeScript estrito
- React 19 e Tailwind CSS 4
- Supabase PostgreSQL, Auth e Row Level Security
- Resend e React Email
- `qrcode` para geração local dos ingressos
- `@zxing/browser` para leitura dos QR Codes
- Zod, React Hook Form e Vitest
- Vercel para hospedagem

## Funcionalidades

- múltiplos eventos em `/eventos/[slug]`;
- formulário responsivo com LGPD, máscara, honeypot e rate limit;
- confirmação atômica de vagas e lista de espera;
- bloqueio de e-mail ou telefone duplicado por evento;
- ingresso individual sem dados pessoais no QR Code;
- confirmação imediata mesmo quando o e-mail falha;
- e-mail com QR Code inline e link do ingresso;
- reenvio público com resposta neutra e limitação;
- Supabase Auth sem cadastro administrativo público;
- papéis de administrador e operador de check-in;
- painel de eventos, inscritos, relatórios e equipe;
- capa, logo e campos personalizados por evento (texto, seleção ou confirmação);
- scanner mobile com câmera traseira, lanterna quando suportada e modo manual;
- check-in transacional contra leituras simultâneas;
- CSV UTF-8 com BOM e separador compatível com Excel brasileiro;
- logs de check-in, e-mail e auditoria;
- histórico administrativo filtrável por evento;
- endpoint `/api/health`.

## Instalação local

Requisitos: Node.js 20 ou superior, npm, Docker Desktop e um projeto Supabase.

```bash
npm install
copy .env.example .env.local
npx supabase start
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

Para não misturar produção e Docker, mantenha as credenciais do projeto remoto em `.env.local` e crie um `.env.development.local` com os valores exibidos por `npx supabase status`. O Next.js prioriza esse arquivo apenas durante `npm run dev`. Deixe `RESEND_API_KEY` vazio nesse ambiente para impedir envios reais durante testes.

## Variáveis de ambiente

Copie `.env.example` para `.env.local`. Nunca envie `.env.local` ao GitHub.

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
EVENT_FROM_EMAIL=Tropa de Elite <ingressos@seudominio.com.br>
EVENT_REPLY_TO_EMAIL=equipadodanmkt@gmail.com

QR_TOKEN_SECRET=
CHECKIN_RATE_LIMIT_SECRET=

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e os segredos nunca podem usar o prefixo `NEXT_PUBLIC_`.

Gere os segredos com um gerador criptográfico. Exemplo em PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Configuração do Supabase

1. Instale ou execute a CLI do Supabase.
2. Autentique-se localmente sem compartilhar o token na conversa.
3. Vincule o projeto.
4. Aplique as migrations na ordem numérica.

```bash
npx supabase login
npx supabase link --project-ref ijthvrvuzvnwoqgjkjhx
npx supabase db push
```

Antes de vincular, confirme que a conta autenticada realmente possui o projeto `ijthvrvuzvnwoqgjkjhx`. Interrompa o processo se outro identificador aparecer.

As migrations estão em [`supabase/migrations`](./supabase/migrations):

1. schema, tabelas, índices e tipos;
2. inscrição/check-in atômicos e RLS;
3. rate limit persistido;
4. resumos administrativos e busca mascarada;
5. consulta segura do ingresso no check-in;
6. paginação administrativa de participantes;
7. criação automática de perfil para usuários do Auth;
8. privilégios SQL mínimos para PostgREST, preservando a autorização por RLS;
9. ordenação segura e paginada da lista de participantes.

### Criar o primeiro administrador

Não há cadastro público. Crie o usuário em **Supabase → Authentication → Users**. Depois execute no SQL Editor, substituindo o e-mail:

```sql
insert into public.profiles (id, full_name, global_role, active)
select id, 'Administrador Tropa de Elite', 'admin', true
from auth.users
where email = 'SEU_EMAIL_ADMINISTRATIVO'
on conflict (id) do update
set global_role = 'admin', active = true;
```

Depois acesse `/admin/login`. Os próximos usuários podem ser convidados em `/admin/equipe`.

O caminho completo para entrar no painel e acompanhar os leads está em [`docs/ACESSO-ADMIN.md`](./docs/ACESSO-ADMIN.md).

### Auth URLs

Em **Authentication → URL Configuration**:

- Site URL local: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/confirm`
- Produção: `https://tropadeelite.filipezetech.com/auth/confirm`

Mantenha o provedor de e-mail habilitado para permitir login com senha, mas desative o cadastro público global. Convites são gerados pelo Supabase e enviados pelo painel através da Resend usando um `token_hash` de uso único.

## Configuração do Resend

1. Adicione e verifique o domínio remetente no Resend.
2. Publique no DNS os registros DKIM e SPF fornecidos pelo Resend.
3. Crie uma API key restrita ao envio.
4. Defina `EVENT_FROM_EMAIL` usando o domínio verificado.
5. Use `equipadodanmkt@gmail.com` apenas como `EVENT_REPLY_TO_EMAIL` temporário.

Não use um endereço Gmail como remetente de produção sem domínio verificado. Se o Resend falhar, a inscrição continua confirmada, o ingresso permanece visível e a falha fica registrada em `email_logs`. Convites da equipe também usam a Resend; se o envio falhar, o usuário incompleto é removido e o painel informa o erro.

Pré-visualize o template:

```bash
npm run email:dev
```

## Vercel e domínio

1. Importe o repositório GitHub na Vercel.
2. Cadastre todas as variáveis do `.env.example` em Production, Preview e Development conforme necessário.
3. Configure `NEXT_PUBLIC_APP_URL=https://tropadeelite.filipezetech.com` em produção.
4. Adicione `tropadeelite.filipezetech.com` em **Settings → Domains**.
5. Crie o CNAME indicado pela Vercel no provedor DNS.
6. Aguarde a emissão do certificado HTTPS antes de testar a câmera.

## Operação

### Criar um evento

1. Entre como administrador.
2. Acesse **Eventos → Novo evento**.
3. Defina capacidade, período, local e política de privacidade.
4. Cadastre o link do WhatsApp e o e-mail de suporte.
5. Altere o status de `draft` para `open`.
6. Abra `/eventos/[slug]` em janela anônima e faça uma inscrição de teste.

Um evento só pode ser aberto após informar uma URL HTTPS para a Política de Privacidade.

### Cadastrar operadores

Em **Equipe**, informe nome, e-mail e evento. O operador recebe um convite e define a senha. Operadores acessam apenas os eventos atribuídos e recebem dados mascarados na busca manual.

### Testar o scanner

1. Use celular conectado à internet.
2. Abra `/admin/eventos/[id]/checkin` em HTTPS.
3. Autorize a câmera.
4. Leia um ingresso de teste.
5. Confirme a entrada.
6. Leia novamente e confirme a mensagem “Entrada já registrada”.
7. Teste também código digitado e busca por nome.

### Reenviar ingresso

- Público: `/eventos/[slug]/reenviar-ingresso`.
- Administrador: ação de e-mail na tabela de inscritos.

Há intervalo mínimo entre reenvios e a resposta pública nunca confirma se o endereço está cadastrado.

### Exportar participantes

Abra **Evento → Inscritos → Exportar CSV**. O arquivo contém dados, status, presença e respostas personalizadas.

## Testes e qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

Atualmente a suíte inclui 26 testes unitários/de rotas e 31 testes PostgreSQL, cobrindo última vaga, lista de espera, duplicidades, QR inválido, check-in manual, dois check-ins simultâneos, falha de e-mail, limite de reenvio, CSV e rotas administrativas sem autenticação. Antes do primeiro evento real, repita também a validação em um projeto Supabase de homologação.

## Contingência para o dia do evento

1. Faça uma exportação CSV na véspera e outra antes da abertura dos portões.
2. Teste o login de todos os operadores.
3. Teste câmera, rede móvel e Wi-Fi em cada aparelho.
4. Mantenha pelo menos um notebook para busca manual.
5. Tenha carregadores e power banks disponíveis.
6. Se a câmera falhar, use código ou busca por nome/telefone.
7. Se a internet cair, não considere a leitura confirmada; aguarde a conexão voltar.
8. Se o participante estiver sem bateria, localize-o manualmente.
9. Não compartilhe planilhas ou capturas com dados pessoais fora da equipe autorizada.
10. Após o evento, exporte o relatório e defina o prazo de retenção/anonymização dos dados.

## Segurança e LGPD

- QR Codes contêm apenas `EVENT:TOKEN_ALEATORIO`.
- Participantes não acessam tabelas diretamente.
- A service role existe somente no servidor.
- Autorizações são verificadas nas rotas e nas funções PostgreSQL.
- Operadores recebem somente dados necessários e mascarados.
- Logs técnicos não armazenam IP puro; somente hash com segredo.
- A exclusão ou anonimização deve seguir o prazo definido pela organização e a política publicada.

## Limitações atuais

- O check-in depende de internet; modo offline não é suportado.
- Turnstile está preparado por variáveis, mas é opcional e ainda não é exigido.
- Sentry é opcional e ainda não está habilitado.
- A aplicação precisa das migrations e variáveis reais para executar os fluxos integrados.
