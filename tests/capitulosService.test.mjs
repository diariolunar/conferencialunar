import assert from "node:assert/strict";
import test from "node:test";

import {
  encontrarCapituloPorTexto,
  sugerirCapituloPorTexto
} from "../src/services/capitulosService.js";

const capitulos = [
  {
    id: "cap-8",
    titulo: "Capítulo 8 - Depois da noite",
    ordem: 8,
    link: "https://www.wattpad.com/8"
  },
  {
    id: "cap-18",
    titulo: "Capítulo 18 - O retorno",
    ordem: 18,
    link: "https://www.wattpad.com/18"
  },
  {
    id: "extra",
    titulo: "Especial de inverno",
    ordem: 19,
    link: "https://www.wattpad.com/19"
  }
];

test("não confunde capítulo 8 com capítulo 18", () => {
  const encontrado = encontrarCapituloPorTexto(capitulos, "8");

  assert.equal(encontrado?.id, "cap-8");
});

test("não sugere capítulo 18 quando a busca explícita é 8 e o 8 não existe", () => {
  const semCapitulo8 = capitulos.filter((capitulo) => capitulo.id !== "cap-8");
  const encontrado = encontrarCapituloPorTexto(semCapitulo8, "cap 8");
  const sugerido = sugerirCapituloPorTexto(semCapitulo8, "cap 8");

  assert.equal(encontrado, null);
  assert.equal(sugerido, null);
});

test("reconhece capítulo com zero à esquerda", () => {
  const encontrado = encontrarCapituloPorTexto(capitulos, "capítulo 08");

  assert.equal(encontrado?.id, "cap-8");
});

test("continua encontrando por título quando não há número explícito", () => {
  const encontrado = encontrarCapituloPorTexto(capitulos, "especial inverno");

  assert.equal(encontrado?.id, "extra");
});
