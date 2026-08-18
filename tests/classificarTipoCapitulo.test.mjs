import assert from "node:assert/strict";
import test from "node:test";

import {
  classificarTipoCapitulo,
  LIMITE_PALAVRAS_CAPITULO_ESPECIAL
} from "../src/utils/classificarTipoCapitulo.js";

test("classifica capítulo com menos de 900 palavras como Especial", () => {
  assert.equal(
    classificarTipoCapitulo({
      titulo: "Capítulo 1",
      palavras: 899,
      tipoAtual: "Normal"
    }),
    "Especial"
  );
});

test("não classifica 900 palavras ou contagem desconhecida como Especial", () => {
  assert.equal(LIMITE_PALAVRAS_CAPITULO_ESPECIAL, 900);
  assert.equal(
    classificarTipoCapitulo({ titulo: "Capítulo 1", palavras: 900 }),
    "Normal"
  );
  assert.equal(
    classificarTipoCapitulo({ titulo: "Capítulo 1", palavras: 0 }),
    "Normal"
  );
});

test("classifica Prólogo com ou sem acento como Especial", () => {
  assert.equal(
    classificarTipoCapitulo({ titulo: "Prólogo", palavras: 1500 }),
    "Especial"
  );
  assert.equal(
    classificarTipoCapitulo({ titulo: "I | Prologo", palavras: 0 }),
    "Especial"
  );
});

test("preserva classificações existentes quando a regra especial não se aplica", () => {
  assert.equal(
    classificarTipoCapitulo({
      titulo: "Versos da noite",
      palavras: 1200,
      tipoAtual: "Poesia"
    }),
    "Poesia"
  );
});
