import assert from "node:assert/strict";
import test from "node:test";

import { interpretarFicha } from "../src/utils/interpretarFicha.js";

test("limpa estilos, reconhece (minha), ignora obra xxx e aceita espaço após dois pontos", () => {
  const ficha = interpretarFicha(`
    User :   @Leitora_01
    Obra 1: ✨ (minha) Excidium: A Ruína do Véu ✨
    Capítulos lidos: I e II
    Obra 2: xxx
  `);

  assert.equal(ficha.userLeitor, "Leitora_01");
  assert.equal(ficha.blocosObras.length, 1);
  assert.equal(ficha.obraLida, "Excidium: A Ruína do Véu");
  assert.equal(ficha.blocosObras[0].minhaObra, true);
  assert.deepEqual(ficha.capitulosInformados, ["MINHA_OBRA"]);
});

test("mantém capítulos informados quando a obra não é marcada como minha", () => {
  const ficha = interpretarFicha(`
    User: @Leitora
    Obra 1: ✨ Mercadoria de Luxo ✨
    Capítulos lidos: I e II
  `);

  assert.equal(ficha.obraLida, "Mercadoria de Luxo");
  assert.deepEqual(ficha.capitulosInformados, ["I", "II"]);
  assert.equal(ficha.blocosObras[0].minhaObra, false);
});

test("reconhece o marcador (minha) depois do nome da obra", () => {
  const ficha = interpretarFicha(`
    User: @Leitora
    Obra 1: O Amado da Luzz (minha)
    Capítulos lidos: 1 e 2
  `);

  assert.equal(ficha.obraLida, "O Amado da Luzz");
  assert.equal(ficha.blocosObras[0].minhaObra, true);
  assert.deepEqual(ficha.capitulosInformados, ["MINHA_OBRA"]);
});
