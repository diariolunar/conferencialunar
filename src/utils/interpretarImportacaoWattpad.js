export function interpretarImportacaoWattpad(texto = "") {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  let titulo = "";
  let capa = "";
  let link = "";
  const capitulos = [];

  let lendoCapitulos = false;

  linhas.forEach((linha) => {
    const linhaLower = linha.toLowerCase();

    if (linhaLower.startsWith("título:") || linhaLower.startsWith("titulo:")) {
      titulo = linha.replace(/^t[íi]tulo\s*:/i, "").trim();
      return;
    }

    if (linhaLower.startsWith("capa:")) {
      capa = linha.replace(/^capa\s*:/i, "").trim();
      return;
    }

    if (linhaLower.startsWith("link:")) {
      link = linha.replace(/^link\s*:/i, "").trim();
      return;
    }

    if (linhaLower.startsWith("capítulos") || linhaLower.startsWith("capitulos")) {
      lendoCapitulos = true;
      return;
    }

    if (!lendoCapitulos) {
      return;
    }

    const linhaSemOrdem = linha.replace(/^\d+[\).\-–—]\s*/, "").trim();

    const partes = linhaSemOrdem.split("|").map((parte) => parte.trim());

    const tituloCapitulo = partes[0] || "";
    const linkCapitulo = partes[1] || "";
    const palavras = Number(partes[2] || 0);
    const paragrafos = Number(partes[3] || 0);

    if (!tituloCapitulo) {
      return;
    }

    capitulos.push({
      wattpadId: extrairIdDoLink(linkCapitulo),
      titulo: tituloCapitulo,
      link: linkCapitulo,
      palavras,
      paragrafos,
      ordem: capitulos.length + 1,
      tipo: "Normal"
    });
  });

  return {
    obra: {
      titulo,
      capa,
      link,
      descricao: "",
      wattpadId: extrairIdObra(link)
    },
    capitulos,
    totalCapitulos: capitulos.length
  };
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
