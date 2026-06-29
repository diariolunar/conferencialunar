export function interpretarImportacaoWattpad(texto = "") {
  const importacoes = interpretarImportacoesWattpad(texto);

  return (
    importacoes[0] || {
      obra: criarObraVazia(),
      capitulos: [],
      totalCapitulos: 0
    }
  );
}

export function interpretarImportacoesWattpad(texto = "") {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const importacoes = [];
  let atual = criarImportacaoVazia();
  let lendoCapitulos = false;

  function finalizarAtual() {
    if (!atual.obra.titulo && atual.capitulos.length === 0) return;

    importacoes.push({
      ...atual,
      totalCapitulos: atual.capitulos.length
    });
  }

  linhas.forEach((linha) => {
    const linhaLower = linha.toLowerCase();

    if (linhaLower.startsWith("título:") || linhaLower.startsWith("titulo:")) {
      if (atual.obra.titulo || atual.capitulos.length > 0) {
        finalizarAtual();
        atual = criarImportacaoVazia();
      }

      atual.obra.titulo = limparValor(linha.replace(/^t[íi]tulo\s*:/i, ""));
      lendoCapitulos = false;
      return;
    }

    if (linhaLower.startsWith("autor:") || linhaLower.startsWith("autora:")) {
      atual.obra.autor = limparValor(linha.replace(/^autor(a)?\s*:/i, ""));
      return;
    }

    if (linhaLower.includes("user") && linhaLower.includes("autor")) {
      atual.obra.userAutor = limparValor(linha.split(":").slice(1).join(":")).replace(/^@/, "");
      return;
    }

    if (linhaLower.startsWith("capa:")) {
      atual.obra.capa = limparValor(linha.replace(/^capa\s*:/i, ""));
      return;
    }

    if (linhaLower.startsWith("link:")) {
      atual.obra.link = limparValor(linha.replace(/^link\s*:/i, ""));
      atual.obra.wattpadId = extrairIdObra(atual.obra.link);
      return;
    }

    if (linhaLower.startsWith("capítulos") || linhaLower.startsWith("capitulos")) {
      lendoCapitulos = true;
      return;
    }

    if (!lendoCapitulos) return;

    const capitulo = interpretarLinhaCapitulo(linha, atual.capitulos.length + 1);

    if (capitulo) {
      atual.capitulos.push(capitulo);
    }
  });

  finalizarAtual();

  return importacoes;
}

function criarObraVazia() {
  return {
    titulo: "",
    capa: "",
    link: "",
    autor: "",
    userAutor: "",
    descricao: "",
    wattpadId: ""
  };
}

function criarImportacaoVazia() {
  return {
    obra: criarObraVazia(),
    capitulos: []
  };
}

function interpretarLinhaCapitulo(linha = "", ordem = 1) {
  const linhaSemOrdem = linha.replace(/^\d+[\).\-–—]\s*/, "").trim();
  const partes = linhaSemOrdem.split("|").map((parte) => parte.trim());

  const tituloBruto = partes[0] || "";
  const linkCapitulo = partes[1] || "";
  const palavras = Number(partes[2] || 0);
  const paragrafos = Number(partes[3] || 0);

  const tituloCapitulo = limparTituloCapitulo(tituloBruto);

  if (!tituloCapitulo) return null;

  return {
    wattpadId: extrairIdDoLink(linkCapitulo),
    titulo: tituloCapitulo,
    link: linkCapitulo,
    palavras,
    paragrafos,
    ordem,
    tipo: detectarTipoCapitulo(tituloCapitulo)
  };
}

function limparValor(valor = "") {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function limparTituloCapitulo(titulo = "") {
  let limpo = limparValor(titulo);

  limpo = limpo.replace(
    /\s+(seg|segunda|ter|terça|terca|qua|quarta|qui|quinta|sex|sexta|sáb|sab|sábado|sabado|dom|domingo),?\s+(jan|janeiro|fev|fevereiro|mar|março|marco|abr|abril|mai|maio|jun|junho|jul|julho|ago|agosto|set|setembro|out|outubro|nov|novembro|dez|dezembro)\s+\d{1,2},?\s+\d{4}.*$/i,
    ""
  );

  limpo = limpo.replace(
    /\s+(mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday),?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}.*$/i,
    ""
  );

  limpo = limpo.replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/i, "");
  limpo = limpo.replace(/\s+\d{4}-\d{2}-\d{2}.*$/i, "");
  limpo = limpo.replace(/\s+(publicado|atualizado|updated|published).*$/i, "");

  return limparValor(limpo);
}

function detectarTipoCapitulo(titulo = "") {
  const normalizado = titulo.toLowerCase();

  if (normalizado.includes("poesia") || normalizado.includes("poema")) {
    return "Poesia";
  }

  if (normalizado.includes("especial")) {
    return "Especial";
  }

  return "Normal";
}

function extrairIdDoLink(link = "") {
  const match = String(link).match(/wattpad\.com\/(\d+)/i);
  return match?.[1] || "";
}

function extrairIdObra(link = "") {
  const matchStory = String(link).match(/wattpad\.com\/story\/(\d+)/i);
  if (matchStory?.[1]) return matchStory[1];

  const matchNumero = String(link).match(/(\d{5,})/);
  return matchNumero?.[1] || "";
}
