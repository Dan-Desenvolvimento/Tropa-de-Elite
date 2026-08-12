# Meta Ads — Execução Tropa de Elite (reta final)

## Status de execução

- Conta de anúncios informada para execução: `650860197211246`.
- Campanha criada/ativada via Meta: **não** — não há sessão autenticada nem Marketing API disponível neste ambiente.
- Campanhas antigas: manter **pausadas** e não excluir.
- Pixel/dataset: `1760053031291739` (Pixel - Tropa de Elite).
- Evento principal: `CompleteRegistration` / `Concluir inscrição`.
- URL real do formulário: `https://tropa.filipezetech.com/inscricao`.
- Período: início após a remoção do modo de teste na Vercel; término em **15/08/2026**, horário local de Vitória da Conquista/BA.
- Limite total: **R$ 2.600** (não ultrapassar).

## Pré-condição obrigatória

Antes de ativar, remover no ambiente **Production** da Vercel `META_TEST_EVENT_CODE` e `META_CAPI_DEBUG`, publicar um novo deploy e verificar no Network que a CAPI não contém `test_event_code`. Essa ação ainda depende do acesso autenticado à Vercel.

## Campanha

**Nome:** `[LEADS][SITE][COMPLETE REG] TROPA | RETA FINAL | AGO26`

- Objetivo: Leads
- Local de conversão: Website
- Dataset: Pixel - Tropa de Elite (`1760053031291739`)
- Evento: `CompleteRegistration`
- Otimização: maximizar número de conversões
- Estratégia: ABO (orçamento por conjunto)
- Status inicial: PAUSED até a pré-condição ser confirmada

## Conjunto 01 — Aquisição

**Nome:** `[ACQ][VDC][BROAD] COMPLETE REG`

- Orçamento de referência: R$ 2.080 lifetime (80% do total)
- Localização: Vitória da Conquista/BA, aproximadamente 30 km
- Preferência: pessoas que moram nesta localização
- Público amplo, sem gênero, sem hipersegmentação
- Advantage+ Audience e Advantage+ Placements quando disponíveis
- Evento: `CompleteRegistration`
- Destino: `https://tropa.filipezetech.com/inscricao`

Criativos iniciais, reutilizando os ativos/posts existentes sem editar os anúncios históricos:

1. **Tropa 10** — ativo histórico `120247287622090452` (prioridade 1)
2. **Carrossel LP** — ativo histórico `120247193341470452` (prioridade 2)
3. **Tropa 01** — ativo histórico `120247187985420452` (prioridade 3)

Não incluir inicialmente Tropa 02 nem Carrossel FORM.

## Conjunto 02 — Remarketing

**Nome:** `[RMKT][HOT][NO REG] TROPA RETA FINAL`

- Orçamento de referência: R$ 520 lifetime (20% do total)
- Janela: 30 dias
- Evento: `CompleteRegistration`
- Destino: `https://tropa.filipezetech.com/inscricao`
- Públicos, por prioridade: FormStarted; visitantes PageView; Instagram Engagement; Facebook/Page Engagement; Video Viewers
- Excluir sempre CompleteRegistration/inscritos confirmados

Anúncios novos:

### RMKT AD01

**Título:** VOCÊ AINDA NÃO CONCLUIU SUA INSCRIÇÃO.

Você demonstrou interesse no Tropa de Elite, mas sua inscrição ainda não foi concluída.

Estamos na reta final das inscrições em Vitória da Conquista. Se você quer participar desse dia de liderança, desenvolvimento e alta performance, finalize agora sua inscrição gratuita. Leva menos de 1 minuto.

CTA: **GARANTIR MINHA VAGA**

### RMKT AD02

**Título:** AS INSCRIÇÕES TERMINAM DIA 15.

O Tropa de Elite está chegando. Empresários, gestores, líderes e profissionais estarão reunidos em Vitória da Conquista para um dia de desenvolvimento e alta performance. Se você já viu o evento e ainda não garantiu sua participação, essa é a hora. Finalize gratuitamente sua inscrição.

CTA: **FINALIZAR INSCRIÇÃO**

## Exclusões

- Excluir evento `CompleteRegistration` pela maior janela disponível.
- Usar também o arquivo privado de inscritos confirmados gerado localmente, quando a Custom Audience for criada manualmente.
- Não usar contatos históricos de WhatsApp como lista; usar apenas Instagram/Facebook/Video/visitantes como proxy.

## UTMs para todos os anúncios

```text
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&meta_campaign_id={{campaign.id}}&meta_adset_id={{adset.id}}&meta_ad_id={{ad.id}}
```

Se a interface usar outra sintaxe para macros, selecionar as equivalentes oficiais mantendo os três IDs.

## Regras de decisão

- KPI principal: `CPA = gasto / CompleteRegistration`.
- R$ 25 ou menos: excelente; R$ 25–35: bom; R$ 35–45: observar; acima de R$ 45: alerta.
- Não pausar por LPV, CTR ou CPC isoladamente.
- Não pausar antes de confirmar atraso de atribuição.
- Primeiro checkpoint: 10 CompleteRegistration. Segundo: 20.

## Pendente de acesso

Para executar na conta **CA - Filipe Zetech 05**, é necessário login no Ads Manager ou token da Marketing API com permissão de anúncios. Sem isso, não é possível confirmar Ad Account, Página, Instagram, Campaign ID ou criar/ativar a estrutura com segurança.
