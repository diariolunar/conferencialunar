import assert from "node:assert/strict";
import test from "node:test";

import { gerarTextoReprovacaoConferencia } from "../src/utils/gerarTextoReprovacaoConferencia.js";

test("gera mensagem com comentarios faltantes", () => {
  const texto = gerarTextoReprovacaoConferencia([
    {
      obraTitulo: "A Mare dos Esquecidos",
      titulo: "Capitulo 27",
      resultado: {
        aprovado: false,
        estatisticas: {
          comentarios: 4,
          minimoNecessario: 6,
          distribuicao: { inicio: 1, meio: 1, fim: 1, geral: 0 }
        },
        regraAplicada: {
          exigeDistribuicao: true,
          exigeTempo: false
        },
        motivos: []
      }
    }
  ]);

  assert.equal(
    texto,
    "Na obra A Mare dos Esquecidos, no capítulo Capitulo 27, faltaram 2 comentários."
  );
});

test("inclui distribuicao e tempo quando tambem reprovaram", () => {
  const texto = gerarTextoReprovacaoConferencia([
    {
      obraTitulo: "Obra X",
      titulo: "Capitulo Y",
      resultado: {
        aprovado: false,
        estatisticas: {
          comentarios: 6,
          minimoNecessario: 6,
          tempoReal: 2,
          tempoEstimado: 10,
          distribuicao: { inicio: 1, meio: 0, fim: 0, geral: 0 }
        },
        regraAplicada: {
          exigeDistribuicao: true,
          exigeTempo: true
        },
        motivos: []
      }
    }
  ]);

  assert.equal(
    texto,
    "Na obra Obra X, no capítulo Capitulo Y, faltou comentário no meio e no fim; o tempo de leitura ficou abaixo do esperado (2min de 10min)."
  );
});

test("inclui falhas de verificacao automatica", () => {
  const texto = gerarTextoReprovacaoConferencia([
    {
      obraTitulo: "Obra X",
      titulo: "Capitulo Y",
      erroVerificacao: true,
      erroMensagem: "Wattpad respondeu com erro."
    }
  ]);

  assert.equal(
    texto,
    "Na obra Obra X, no capítulo Capitulo Y, não foi possível fazer a verificação automática: Wattpad respondeu com erro."
  );
});
