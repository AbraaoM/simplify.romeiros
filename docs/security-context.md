# Contexto servidor — proposta de contrato, não integração pronta

## Estado implementado neste lote

`db/client.ts` retorna null somente sem DATABASE_URL (demo fictícia). Com URL,
`requireDatabaseAccess()` SEMPRE lança antes de criar cliente. Não há bypass por
header, body, query ou env. Não existe provedor auth novo nem sessão simulada em
produção. Leitura falha com estado de erro, nunca rebaixa DB inacessível para demo.
Escrita falha com mensagem genérica. Demo sem URL permanece funcional/read-only.
É bloqueio TEMPORÁRIO deliberado: capacidades DB antes disponíveis ficam desativadas
até integração completa; não é alegação de autenticação implementada.

## Contrato a implementar após revisão arquitetural

Resolver contexto exclusivamente no servidor, a partir de sessão validada pelo
provedor escolhido pelo dono: `subjectId`, `sessionId`, `agencyId` e vínculo ativo.
Nunca confiar em agência de header/body/URL, “primeira agência” ou UUID adivinhável.
agencyId solicitado deve ser autorizado pelo vínculo da sessão; não inventar papéis.
Toda query/repositório receberá contexto verificado de escopo privado ao módulo;
checagem runtime obrigatória (um tipo TypeScript sozinho não autentica).
Para criação, preencher agency_id pelo contexto, não pelo input. Para IDs filhos,
JOIN até excursions.agency_id e conferir vínculo; escrita condicional com RETURNING.
Sessão expirada/sem vínculo: negação antes de qualquer leitura ou escrita.

NÃO substituir gate por aceitar um objeto `{agencyId}` do chamador. NÃO remover
barreira só porque login visual passou. Todas as queries e transações precisam
migrar para o contrato ao mesmo tempo; sem fallback de primeira agência.

## Mapa completo de Server Actions (`src/app/acoes.ts`)

| Action | Serviço | Situação legado sem gate |
|---|---|---|
| saveAgencyAction | saveAgency | sem identidade; atualiza primeira agência |
| createExcursionAction | createExcursion | cria na primeira agência lida |
| updateExcursionAction | updateExcursion | ID conferido no snapshot, sem sessão |
| addBoardingPointAction | addBoardingPoint | excursão no snapshot; duplicata por nome só em memória |
| createPassengerAction | createPassenger | excursão/embarque no snapshot; sem identidade |
| updatePassengerAction | updatePassenger | passageiro+excursão no snapshot; sem identidade |
| addInstallmentAction | addInstallment | passageiro+excursão no snapshot; sequência calculada antes da escrita |
| markPaidAction | markPaid | parcela+passageiro+excursão no snapshot; não é autorização |
| assignSeatAction | assignSeat | poltrona/passageiro no snapshot; corrida cancelamento |
| releaseSeatAction | releaseSeat | poltrona no snapshot; sem sessão |
| cancelPassengerAction | cancelPassenger | confirmação UI não autentica nem autoriza |

Todos chamam serviços; `services/commands.ts:load` converge em getSql (barreira).
Queries de página: `services/queries.ts` -> `db/source.ts` -> readAgencyFromDatabase
-> getSql (barreira). Não há rota alternativa de DB fora destes dois repositórios.

## Mapa de repositórios (sem segurança de tenant no legado)

`repositories/agency.ts:readAgencyFromDatabase`: primeira agência ORDER/LIMIT;
excursões/embarques/passageiros/poltronas/parcelas/quartos/atribuições filtrados por
essa agência. Filtro selecionado pelo servidor, mas sem identidade do usuário.

`repositories/commands.ts`:
- saveAgencyRecord: SELECT primeira agência e UPDATE por ID; INSERT sem usuário.
- insertExcursion: agencyId recebido, sem vínculo de sessão; transaction filhos.
- updateExcursionRecord: UPDATE id somente (sem agency_id).
- insertBoardingPoint: excursionId recebido, sem JOIN de agência.
- insertPassengerRecord: excursionId/boardingPointId recebidos; FK não autentica.
- updatePassengerRecord: id + excursion_id; não confere agência.
- insertInstallmentRecord: passenger_id + excursion_id sem JOIN de pertença;
  unique sequence só evita duplicata, não associa identidade.
- markInstallmentPaid: id + passageiro + excursão + pending; sem contexto agência.
- applySeatChange: UUID validado para SQL interpolado; excursion_id na escrita;
  não verifica status do passageiro sob mesmo lock que cancelamento.
- cancelPassengerRecord: excursion_id e passageiro; assento escolhido por snapshot.
  Concorrência pode deixar poltrona órfã ocupada após cancelamento.

Não executar testes de repository legado com IDs reais: agora getSql bloqueia até
chamadas diretas. Mocks de teste bypassam esse bloqueio explicitamente para estudar
os defeitos, não são mecanismo de desbloqueio de aplicação.

## Testes e limites

- access.test.ts: caminho REAL getSql/source/services, sem SQL mock, sem DB; URL
  propositalmente inválida prova falha antes da construção de cliente.
- security-characterization.test.ts: serviços reais + repos/getSql MOCKADOS.
  Demonstra ID fora do snapshot negado, mas chamador sem sessão aceito no legado
  se barreira fosse burlada; simula cancelamento+snapshot atrasado+atribuição.
  NÃO é prova de ordem/transação SQL real nem teste HTTP autenticado.
- Testes de domínio: excesso INTEGER monetário e sequência, valores malformados,
  scope de poltronas e status inconsistente; fixtures fictícias.

## Backlog bloqueante

1. Escolha/integração de provedor e modelo de vínculo; nenhuma escolha feita aqui.
2. Escopo de sessão/agência em TODOS repositórios + ações/páginas, teste nega A->B.
3. Locks de passageiro em ordem estável na atribuição/cancelamento; revalidar status
   e assento dentro da transação. Testar interleavings num Postgres local descartável.
4. Consentimento não presumido: finalidade de documentos, controlador, retenção,
   controle de acesso, auditoria mínima sem dados excessivos; revisão LGPD.
5. Tests HTTP/browser e erro de sessão; somente depois reconsiderar liberação DB.

Sem deploy/push/PR/pagamento/envio/migração. Produção NÃO pronta.
