import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizarUsuario,
  normalizarUsuario
} from "../src/utils/normalizarUsuario.js";

test("converte Kazmaleão para a forma canônica Kazmaleao", () => {
  assert.equal(canonicalizarUsuario("Kazmaleão"), "Kazmaleao");
  assert.equal(canonicalizarUsuario("@kazmaleÃO"), "Kazmaleao");
  assert.equal(normalizarUsuario("Kazmaleão"), "kazmaleao");
});

test("preserva outros usuários, removendo apenas arroba e espaços", () => {
  assert.equal(canonicalizarUsuario("  @LeitoraTeste  "), "LeitoraTeste");
});
