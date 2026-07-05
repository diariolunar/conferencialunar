import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "../api/wattpad/capitulo-detalhes.js";

const {
  combinarParagrafos,
  extrairNomeUsuarioComentario,
  filtrarComentariosDoUsuario
} = __testables;

test("combinarParagrafos preserva a ordem do texto real quando a API traz ids extras", () => {
  const paragrafosHtml = [
    { id: "inicio", texto: "Primeiro paragrafo", palavras: 2 },
    { id: "meio", texto: "Segundo paragrafo", palavras: 2 },
    { id: "fim", texto: "Terceiro paragrafo", palavras: 2 }
  ];

  const paragrafosApi = [
    { id: "inicio", commentCount: 4 },
    { id: "extra-antigo", commentCount: 99 },
    { id: "fim", commentCount: 7 }
  ];

  const combinados = combinarParagrafos(paragrafosHtml, paragrafosApi);

  assert.deepEqual(
    combinados.map((paragrafo) => paragrafo.id),
    ["inicio", "meio", "fim"]
  );
  assert.equal(combinados[0].commentCount, 4);
  assert.equal(combinados[1].commentCount, 0);
  assert.equal(combinados[2].commentCount, 7);
  assert.deepEqual(
    combinados.map((paragrafo) => paragrafo.posicao),
    ["inicio", "meio", "fim"]
  );
});

test("combinarParagrafos usa a API como fallback quando o texto nao traz paragrafos", () => {
  const combinados = combinarParagrafos([], [
    { id: "p1", commentCount: 1 },
    { id: "p2", commentCount: 2 }
  ]);

  assert.deepEqual(
    combinados.map((paragrafo) => paragrafo.id),
    ["p1", "p2"]
  );
  assert.equal(combinados[0].commentCount, 1);
  assert.equal(combinados[1].commentCount, 2);
});

test("filtrarComentariosDoUsuario aceita user.name e user.username", () => {
  const paragrafos = combinarParagrafos(
    [
      { id: "a", texto: "Inicio", palavras: 1 },
      { id: "b", texto: "Meio", palavras: 1 },
      { id: "c", texto: "Fim", palavras: 1 }
    ],
    []
  );

  const comentarios = [
    {
      resource: { namespace: "paragraphs", resourceId: "123_a" },
      user: { username: "LeitoraTeste" },
      commentId: { resourceId: "c1" },
      text: "Gostei"
    },
    {
      resource: { namespace: "paragraphs", resourceId: "123_c" },
      user: { name: "outraPessoa" },
      commentId: { resourceId: "c2" },
      text: "Outro comentario"
    }
  ];

  const filtrados = filtrarComentariosDoUsuario({
    comentarios,
    capituloId: "123",
    paragrafos,
    userLeitor: "@leitorateste"
  });

  assert.equal(extrairNomeUsuarioComentario(comentarios[0]), "LeitoraTeste");
  assert.equal(filtrados.length, 1);
  assert.equal(filtrados[0].id, "c1");
  assert.equal(filtrados[0].posicao, "inicio");
});
