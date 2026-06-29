import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretarImportacaoWattpad } from "../src/utils/interpretarImportacaoWattpad.js";

test("preserva barra vertical no titulo e ainda extrai o link do capitulo", () => {
  const texto = `TITULO: HP
CAPITULOS:
1. I | Prologo | https://www.wattpad.com/1357686687-hp-1-o-conto-de-zahir-drarry-i-prologo
2. [II | O menino que sobreviveu](https://www.wattpad.com/1357686688-hp-1-o-conto-de-zahir-drarry-ii-o-menino)`;

  const importacao = interpretarImportacaoWattpad(texto);

  assert.equal(importacao.capitulos[0].titulo, "I | Prologo");
  assert.equal(
    importacao.capitulos[0].link,
    "https://www.wattpad.com/1357686687-hp-1-o-conto-de-zahir-drarry-i-prologo"
  );
  assert.equal(importacao.capitulos[0].wattpadId, "1357686687");
  assert.equal(
    importacao.capitulos[1].titulo,
    "II | O menino que sobreviveu"
  );
  assert.equal(importacao.capitulos[1].wattpadId, "1357686688");
});
