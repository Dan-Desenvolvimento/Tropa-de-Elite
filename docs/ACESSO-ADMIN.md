# Acesso administrativo e acompanhamento dos leads

## Entrar no painel

- Desenvolvimento local: `http://localhost:3000/admin/login`
- Produção: `https://tropadeelite.filipezetech.com/admin/login`

Não existe cadastro público de administradores. Em produção, o primeiro usuário deve ser criado no projeto Supabase `ijthvrvuzvnwoqgjkjhx` e promovido para administrador conforme as instruções abaixo.

## Onde acompanhar os cadastros

1. Entre no painel.
2. Abra **Eventos**.
3. Selecione o evento desejado.
4. Abra **Inscritos** para pesquisar, filtrar, ordenar, visualizar ou exportar participantes.
5. Abra **Relatórios** para acompanhar capacidade, inscrições confirmadas, lista de espera, cancelamentos, check-ins, ausentes e e-mails.
6. Abra **Check-in** no dia do evento para ler o QR Code ou localizar alguém manualmente.

### Significado dos status

- `confirmed`: inscrição e vaga confirmadas; o ingresso foi gerado.
- `waitlist`: participante na lista de espera.
- `cancelled`: inscrição cancelada.
- **Check-in realizado**: a entrada física foi confirmada pela equipe.

O ingresso aparece imediatamente após a inscrição. A entrega do e-mail é registrada separadamente e uma falha no Resend não apaga a inscrição.

## Criar o primeiro administrador em produção

1. No Supabase novo, abra **Authentication → Users → Add user**.
2. Crie o usuário com seu e-mail administrativo e uma senha forte.
3. Abra o **SQL Editor** no mesmo projeto `ijthvrvuzvnwoqgjkjhx`.
4. Execute o SQL abaixo, substituindo o e-mail:

```sql
insert into public.profiles (id, full_name, global_role, active)
select id, 'Administrador Tropa de Elite', 'admin', true
from auth.users
where lower(email) = lower('SEU_EMAIL_ADMINISTRATIVO')
on conflict (id) do update
set full_name = excluded.full_name,
    global_role = 'admin',
    active = true,
    updated_at = now();
```

Esse procedimento só funciona depois que as migrations do projeto forem aplicadas no Supabase novo.

## Segurança

- Não compartilhe a senha administrativa.
- Não envie chaves do Supabase ou Resend por conversa.
- Cadastre segredos somente no `.env.local` e nas variáveis protegidas da Vercel.
- Operadores devem ser convidados em **Equipe** e recebem acesso somente aos eventos atribuídos.
