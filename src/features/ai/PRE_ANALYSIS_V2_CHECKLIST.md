# Checklist manual da pre-analise v2

## Escopo da validacao

Confirmar que a alteracao esta isolada em prompt, schema, renderizacao e versionamento do laudo previo.

## Checklist

- [ ] Gerar laudo com documentos simples processados.
- [ ] Confirmar que o texto nao ficou generico e que ha confronto entre narrativa, pedidos e documentos.
- [ ] Validar a matriz final de confronto com os quatro blocos:
  - [ ] o que o autor narra
  - [ ] o que os documentos provam
  - [ ] o que os documentos nao provam
  - [ ] o que pode ser explorado pela defesa
- [ ] Validar que a analise de pedidos separa pedidos sustentados de pedidos nao sustentados ou fracos.
- [ ] Confirmar que divergencias entre autor, documento e terceiro aparecem quando houver base documental.
- [ ] Confirmar que assinatura, foto, layout ou edicao ficam como nao verificavel quando o contexto nao trouxer base textual suficiente.
- [ ] Confirmar que pontos exploraveis para defesa retornam categoria, relevancia, explorabilidade e flag de validacao humana.
- [ ] Confirmar que documentos internos recomendados para defesa aparecem no laudo.
- [ ] Confirmar que o report novo salva com `prompt_version = "v2_prova_autor_defesa"`.
- [ ] Abrir laudos antigos e verificar compatibilidade visual minima sem quebra de tela.
- [ ] Testar campos vazios e confirmar estado neutro elegante na UI.
- [ ] Confirmar que nao houve alteracao em fluxo geral, upload, auth, storage, workflow ou logica de processamento documental.

## Observacoes esperadas

- Quando faltar base documental, o laudo deve usar linguagem prudente, como "nao foi possivel verificar com os documentos disponiveis".
- O laudo nao deve afirmar fraude.
- Sinais de manipulacao, edicao ou inconsistencias devem vir apenas como indicios e com ressalva de validacao humana quando cabivel.
