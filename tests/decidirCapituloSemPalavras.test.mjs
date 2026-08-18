import assert from "node:assert/strict";
import test from "node:test";

import { decidirCapituloSemPalavras } from "../src/utils/decidirCapituloSemPalavras.js";

test("oferece link do capítulo e as opções tentar novamente ou ignorar", async () => {
  let configuracao;
  const dialog = {
    confirm(valor) {
      configuracao = valor;
      return Promise.resolve("ignorar");
    }
  };

  const resposta = await decidirCapituloSemPalavras({
    dialog,
    capitulo: { titulo: "Capítulo 1" },
    link: "https://www.wattpad.com/123456-capitulo",
    tentativa: 2
  });

  assert.equal(resposta, "ignorar");
  assert.equal(configuracao.linkLabel, "Abrir capítulo");
  assert.equal(
    configuracao.linkUrl,
    "https://www.wattpad.com/123456-capitulo"
  );
  assert.equal(configuracao.confirmValue, "tentar_novamente");
  assert.equal(configuracao.cancelValue, "ignorar");
});
