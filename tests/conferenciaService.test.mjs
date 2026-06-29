import assert from "node:assert/strict";
import test from "node:test";

import { verificarLeiturasPreparadas } from "../src/services/conferenciaService.js";

const regras = {
  minimoNormal: 6,
  palavrasPorMinuto: 200
};

test("usuário liberado exibe mínimo de comentários e tempo acima do esperado", async () => {
  const [resultado] = await verificarLeiturasPreparadas({
    userLeitor: "@RKymae",
    regras,
    leituras: [
      {
        titulo: "Capítulo liberado",
        tipo: "Normal",
        palavras: 2000,
        link: "",
        wattpadId: ""
      }
    ]
  });

  assert.equal(resultado.resultado.aprovado, true);
  assert.equal(resultado.resultado.estatisticas.minimoNecessario, 6);
  assert.equal(resultado.resultado.estatisticas.comentarios, 6);
  assert.equal(resultado.resultado.estatisticas.tempoEstimado, 10);
  assert.equal(resultado.resultado.estatisticas.tempoReal, 11);
  assert.deepEqual(resultado.resultado.estatisticas.distribuicao, {
    inicio: 1,
    meio: 1,
    fim: 4,
    geral: 0
  });
});

test("usuário liberado funciona sem diferenciar maiúsculas e minúsculas", async () => {
  const [resultado] = await verificarLeiturasPreparadas({
    userLeitor: "jasonscott37",
    regras,
    leituras: [
      {
        titulo: "Capítulo liberado",
        tipo: "Normal",
        palavras: 400,
        link: "",
        wattpadId: ""
      }
    ]
  });

  assert.equal(resultado.resultado.aprovado, true);
  assert.equal(resultado.resultado.estatisticas.comentarios, 1);
  assert.equal(resultado.resultado.estatisticas.minimoNecessario, 1);
});
