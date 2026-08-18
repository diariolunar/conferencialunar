import assert from "node:assert/strict";
import test from "node:test";

import {
  avaliarStatusCapitulo,
  resumirStatusCapitulos
} from "../src/services/atualizacaoCapitulosService.js";

test("capítulo ignorado com 0 palavras não fica pendente de atualização", () => {
  const status = avaliarStatusCapitulo({
    link: "https://www.wattpad.com/123456",
    palavras: 0,
    paragrafos: 0,
    atualizacaoIgnorada: true
  });

  assert.equal(status.semMetricas, true);
  assert.equal(status.ignorado, true);
  assert.equal(status.precisaAtualizar, false);
});

test("capítulo com 0 palavras continua pendente quando não foi ignorado", () => {
  const status = avaliarStatusCapitulo({
    link: "https://www.wattpad.com/123456",
    palavras: 0,
    paragrafos: 0
  });

  assert.equal(status.ignorado, false);
  assert.equal(status.precisaAtualizar, true);
});

test("resumo contabiliza capítulos ignorados sem marcá-los para atualização", () => {
  const resumo = resumirStatusCapitulos([
    {
      wattpadId: "123456",
      palavras: 0,
      paragrafos: 0,
      atualizacaoIgnorada: true
    }
  ]);

  assert.equal(resumo.ignorados, 1);
  assert.equal(resumo.precisamAtualizar, 0);
});
