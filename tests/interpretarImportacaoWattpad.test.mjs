import assert from "node:assert/strict";
import { test } from "node:test";

import {
  interpretarImportacaoWattpad,
  interpretarImportacoesWattpad
} from "../src/utils/interpretarImportacaoWattpad.js";

test("interpreta varios blocos do bookmarklet em importacoes separadas", () => {
  const texto = `TÍTULO: Obra A
AUTOR: Autora A
USER AUTOR: @autoraa
CAPA: https://img.example/a.jpg
LINK: https://www.wattpad.com/story/111111-obra-a
CAPÍTULOS:
1. Capítulo 1 | https://www.wattpad.com/101010

TÍTULO: Obra B
AUTOR: Autor B
USER AUTOR: @autorb
CAPA: https://img.example/b.jpg
LINK: https://www.wattpad.com/story/222222-obra-b
CAPÍTULOS:
1. Prólogo | https://www.wattpad.com/202020
2. Capítulo 1 | https://www.wattpad.com/303030`;

  const importacoes = interpretarImportacoesWattpad(texto);

  assert.equal(importacoes.length, 2);
  assert.equal(importacoes[0].obra.titulo, "Obra A");
  assert.equal(importacoes[0].obra.wattpadId, "111111");
  assert.equal(importacoes[0].capitulos.length, 1);
  assert.equal(importacoes[1].obra.titulo, "Obra B");
  assert.equal(importacoes[1].obra.userAutor, "autorb");
  assert.equal(importacoes[1].totalCapitulos, 2);
  assert.equal(importacoes[1].capitulos[1].wattpadId, "303030");
});

test("mantem compatibilidade retornando a primeira importacao", () => {
  const texto = `TÍTULO: Obra unica
CAPÍTULOS:
1. Capítulo 1 | https://www.wattpad.com/101010`;

  const importacao = interpretarImportacaoWattpad(texto);

  assert.equal(importacao.obra.titulo, "Obra unica");
  assert.equal(importacao.totalCapitulos, 1);
});
