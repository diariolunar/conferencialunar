import { normalizarTexto } from "./normalizarTexto.js";

function normalizarUrl(url = "") {
  try {
    const valor = new URL(String(url));
    valor.search = "";
    valor.hash = "";
    return valor.toString().replace(/\/$/, "");
  } catch {
    return String(url || "").trim();
  }
}

function idCapitulo(capitulo = {}) {
  return String(capitulo.wattpadId || "").trim();
}

function tituloCapitulo(capitulo = {}) {
  return normalizarTexto(capitulo.titulo || "");
}

function encontrarCorrespondente(capitulo, capitulos = [], usados = new Set()) {
  const id = idCapitulo(capitulo);
  const titulo = tituloCapitulo(capitulo);

  return capitulos.find((candidato, indice) => {
    if (usados.has(indice)) return false;

    const idCandidato = idCapitulo(candidato);
    if (id && idCandidato) return id === idCandidato;

    return Boolean(titulo && titulo === tituloCapitulo(candidato));
  });
}

function compararMetadados(obraLocal = {}, obraWattpad = {}) {
  const campos = [];

  if (
    obraWattpad.titulo &&
    normalizarTexto(obraLocal.titulo || "") !==
      normalizarTexto(obraWattpad.titulo)
  ) {
    campos.push("título");
  }

  if (
    obraWattpad.descricao &&
    normalizarTexto(obraLocal.descricao || "") !==
      normalizarTexto(obraWattpad.descricao)
  ) {
    campos.push("descrição");
  }

  if (
    obraWattpad.capa &&
    normalizarUrl(obraLocal.capa || "") !== normalizarUrl(obraWattpad.capa)
  ) {
    campos.push("capa");
  }

  if (
    obraWattpad.autor &&
    normalizarTexto(obraLocal.autor || "") !== normalizarTexto(obraWattpad.autor)
  ) {
    campos.push("autor");
  }

  if (
    obraWattpad.userAutor &&
    normalizarTexto(obraLocal.userAutor || "") !==
      normalizarTexto(obraWattpad.userAutor)
  ) {
    campos.push("usuário do autor");
  }

  return campos;
}

export function compararObraComWattpad({
  obraLocal = {},
  capitulosLocais = [],
  dadosWattpad = {}
} = {}) {
  const obraWattpad = dadosWattpad.obra || {};
  const capitulosWattpad = Array.isArray(dadosWattpad.capitulos)
    ? dadosWattpad.capitulos
    : [];
  const camposObraAlterados = compararMetadados(obraLocal, obraWattpad);
  const capitulosNovos = [];
  const capitulosAlterados = [];
  const indicesLocaisUsados = new Set();

  capitulosWattpad.forEach((capituloWattpad) => {
    const correspondente = encontrarCorrespondente(
      capituloWattpad,
      capitulosLocais,
      indicesLocaisUsados
    );

    if (!correspondente) {
      capitulosNovos.push(capituloWattpad);
      return;
    }

    const indiceLocal = capitulosLocais.indexOf(correspondente);
    indicesLocaisUsados.add(indiceLocal);

    const campos = [];
    if (tituloCapitulo(correspondente) !== tituloCapitulo(capituloWattpad)) {
      campos.push("título");
    }

    if (
      Number(correspondente.ordem || 0) !==
      Number(capituloWattpad.ordem || 0)
    ) {
      campos.push("ordem");
    }

    const palavrasLocais = Number(correspondente.palavras || 0);
    const palavrasWattpad = Number(capituloWattpad.palavras || 0);
    if (
      palavrasLocais > 0 &&
      palavrasWattpad > 0 &&
      palavrasLocais !== palavrasWattpad
    ) {
      campos.push("palavras");
    }

    if (campos.length) {
      capitulosAlterados.push({
        local: correspondente,
        wattpad: capituloWattpad,
        campos
      });
    }
  });

  const comparacaoIncompleta =
    capitulosLocais.length > 0 && capitulosWattpad.length === 0;
  const capitulosRemovidos = comparacaoIncompleta
    ? []
    : capitulosLocais.filter((_, indice) => !indicesLocaisUsados.has(indice));
  const temDiferencas = Boolean(
    camposObraAlterados.length ||
      capitulosNovos.length ||
      capitulosRemovidos.length ||
      capitulosAlterados.length
  );

  return {
    obraWattpad,
    capitulosWattpad,
    camposObraAlterados,
    capitulosNovos,
    capitulosRemovidos,
    capitulosAlterados,
    comparacaoIncompleta,
    temDiferencas,
    dadosWattpad
  };
}
