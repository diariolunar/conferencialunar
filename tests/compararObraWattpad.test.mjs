import assert from "node:assert/strict";
import test from "node:test";

import { compararObraComWattpad } from "../src/utils/compararObraWattpad.js";

test("identifica metadados e capítulos novos, removidos e alterados", () => {
  const comparacao = compararObraComWattpad({
    obraLocal: {
      titulo: "Título antigo",
      descricao: "Descrição antiga",
      capa: "https://img.test/capa.jpg?size=small"
    },
    capitulosLocais: [
      { wattpadId: "1", titulo: "Capítulo 1", ordem: 1, palavras: 1000 },
      { wattpadId: "2", titulo: "Capítulo removido", ordem: 2, palavras: 900 }
    ],
    dadosWattpad: {
      obra: {
        titulo: "Título novo",
        descricao: "Descrição nova",
        capa: "https://img.test/capa.jpg?size=large"
      },
      capitulos: [
        { wattpadId: "1", titulo: "Capítulo um", ordem: 1, palavras: 1100 },
        { wattpadId: "3", titulo: "Capítulo novo", ordem: 2, palavras: 800 }
      ]
    }
  });

  assert.deepEqual(comparacao.camposObraAlterados, ["título", "descrição"]);
  assert.equal(comparacao.capitulosNovos.length, 1);
  assert.equal(comparacao.capitulosRemovidos.length, 1);
  assert.deepEqual(comparacao.capitulosAlterados[0].campos, [
    "título",
    "palavras"
  ]);
  assert.equal(comparacao.temDiferencas, true);
});

test("não considera todos removidos quando o Wattpad não retorna capítulos", () => {
  const comparacao = compararObraComWattpad({
    capitulosLocais: [{ wattpadId: "1", titulo: "Capítulo 1" }],
    dadosWattpad: { obra: { titulo: "Obra" }, capitulos: [] }
  });

  assert.equal(comparacao.comparacaoIncompleta, true);
  assert.equal(comparacao.capitulosRemovidos.length, 0);
});
