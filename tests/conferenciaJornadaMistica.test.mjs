import assert from "node:assert/strict";
import test from "node:test";

import { verificarLeiturasPreparadas } from "../src/services/conferenciaService.js";

test("Jornada Mistica usa minimo 12 para normal e 1 para especial", async () => {
  const regrasJornada = {
    minimoNormal: 12,
    minimoCurto: 12,
    minimoLongo: 12,
    minimoEspecial: 1,
    minimoPoesia: 1,
    palavrasPorMinuto: 200,
    exigeDistribuicaoNormal: false,
    exigeTempoNormal: false
  };

  const resultados = await verificarLeiturasPreparadas({
    userLeitor: "@RKymae",
    regras: regrasJornada,
    leituras: [
      {
        titulo: "Capitulo normal",
        tipo: "Normal",
        palavras: 2000,
        link: "",
        wattpadId: ""
      },
      {
        titulo: "Capitulo especial",
        tipo: "Especial",
        palavras: 2000,
        link: "",
        wattpadId: ""
      }
    ]
  });

  assert.equal(resultados[0].resultado.estatisticas.minimoNecessario, 12);
  assert.equal(resultados[0].resultado.estatisticas.comentarios, 12);
  assert.equal(resultados[1].resultado.estatisticas.minimoNecessario, 1);
  assert.equal(resultados[1].resultado.estatisticas.comentarios, 1);
});
