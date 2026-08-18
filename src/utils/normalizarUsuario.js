import { normalizarTexto } from "./normalizarTexto.js";

const USUARIOS_CANONICOS = new Map([["kazmaleao", "Kazmaleao"]]);

export function canonicalizarUsuario(usuario = "") {
  const usuarioLimpo = String(usuario || "")
    .trim()
    .replace(/^@/, "");
  const chave = normalizarTexto(usuarioLimpo);

  return USUARIOS_CANONICOS.get(chave) || usuarioLimpo;
}

export function normalizarUsuario(usuario = "") {
  return normalizarTexto(canonicalizarUsuario(usuario));
}
