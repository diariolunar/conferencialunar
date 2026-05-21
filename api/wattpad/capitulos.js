function extrairWattpadId(link = "") {
  const texto = String(link || "").trim();

  const matchStory = texto.match(/wattpad\.com\/story\/(\d+)/i);
  if (matchStory?.[1]) return matchStory[1];

  const matchNumero = texto.match(/(\d{5,})/);
  if (matchNumero?.[1]) return matchNumero[1];

  return "";
}

function limparHtml(texto = "") {
  return String(texto || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buscarMeta(html = "", propriedade = "") {
  const regexProperty = new RegExp(
    `<meta[^>]+property=["']${propriedade}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );

  const regexName = new RegExp(
    `<meta[^>]+name=["']${propriedade}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );

  return (
    html.match(regexProperty)?.[1] ||
    html.match(regexName)?.[1] ||
    ""
  );
}

function buscarTitulo(html = "") {
  const ogTitle = buscarMeta(html, "og:title");

  if (ogTitle) {
    return limparHtml(ogTitle).replace(/\s*-\s*Wattpad$/i, "");
  }

  const title = html.match(/<title[^>]*>(.*?)<\/title>/i);

  if (title?.[1]) {
    return limparHtml(title[1]).replace(/\s*-\s*Wattpad$/i, "");
  }

  return "";
}

function buscarCapa(html = "") {
  return (
    buscarMeta(html, "og:image") ||
    buscarMeta(html, "twitter:image") ||
    ""
  );
}

function buscarDescricao(html = "") {
  return (
    limparHtml(buscarMeta(html, "og:description")) ||
    limparHtml(buscarMeta(html, "description")) ||
    ""
  );
}

function extrairJsonSeguro(texto = "") {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function extrairJsonsDaPagina(html = "") {
  const jsons = [];

  const nextData = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (nextData?.[1]) {
    const json = extrairJsonSeguro(nextData[1]);
    if (json) jsons.push(json);
  }

  const scriptsJson = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  scriptsJson.forEach((script) => {
    const json = extrairJsonSeguro(script[1]);
    if (json) jsons.push(json);
  });

  const scriptsLdJson = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  scriptsLdJson.forEach((script) => {
    const json = extrairJsonSeguro(script[1]);
    if (json) jsons.push(json);
  });

  return jsons;
}

function procurarObjetoStory(objeto, visitados = new WeakSet()) {
  if (!objeto || typeof objeto !== "object") {
    return null;
  }

  if (visitados.has(objeto)) {
    return null;
  }

  visitados.add(objeto);

  const possuiTitulo = objeto.title || objeto.name;
  const possuiPartes =
    Array.isArray(objeto.parts) ||
    Array.isArray(objeto.chapters) ||
    Array.isArray(objeto.tableOfContents);

  if (possuiTitulo && possuiPartes) {
    return objeto;
  }

  if (Array.isArray(objeto)) {
    for (const item of objeto) {
      const encontrado = procurarObjetoStory(item, visitados);
      if (encontrado) return encontrado;
    }
  } else {
    for (const valor of Object.values(objeto)) {
      const encontrado = procurarObjetoStory(valor, visitados);
      if (encontrado) return encontrado;
    }
  }

  return null;
}

function normalizarLinkCapitulo(part) {
  const id = part.id || part.partId || part.groupId || part.urlId || "";
  const url = part.url || part.link || part.href || "";

  if (url && url.startsWith("http")) {
    return url;
  }

  if (url && url.startsWith("/")) {
    return `https://www.wattpad.com${url}`;
  }

  if (id) {
    return `https://www.wattpad.com/${id}`;
  }

  return "";
}

function normalizarCapitulo(part, index) {
  const id =
    part.id ||
    part.partId ||
    part.groupId ||
    part.urlId ||
    "";

  const titulo =
    part.title ||
    part.name ||
    part.heading ||
    part.label ||
    `Parte ${index + 1}`;

  const palavras =
    part.wordCount ||
    part.words ||
    part.numWords ||
    part.length ||
    0;

  const paragrafos =
    part.paragraphCount ||
    part.paragraphs ||
    part.numParagraphs ||
    0;

  return {
    wattpadId: String(id || ""),
    titulo: limparHtml(titulo),
    link: normalizarLinkCapitulo(part),
    palavras: Number(palavras || 0),
    paragrafos: Number(paragrafos || 0),
    ordem: Number(part.order || part.position || part.rank || index + 1),
    tipo: "Normal"
  };
}

function extrairDeJsons(html = "") {
  const jsons = extrairJsonsDaPagina(html);

  for (const json of jsons) {
    const story = procurarObjetoStory(json);

    if (!story) continue;

    const partes =
      story.parts ||
      story.chapters ||
      story.tableOfContents ||
      [];

    if (!Array.isArray(partes) || partes.length === 0) {
      continue;
    }

    return {
      titulo: limparHtml(story.title || story.name || ""),
      capa:
        story.cover ||
        story.coverUrl ||
        story.cover_url ||
        story.image ||
        "",
      descricao: limparHtml(story.description || story.summary || ""),
      capitulos: partes.map(normalizarCapitulo)
    };
  }

  return {
    titulo: "",
    capa: "",
    descricao: "",
    capitulos: []
  };
}

function extrairCapitulosPorLinks(html = "") {
  const capitulos = [];
  const vistos = new Set();

  const links = [
    ...html.matchAll(/<a[^>]+href=["'](\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)
  ];

  links.forEach((match) => {
    const href = match[1];
    const texto = limparHtml(match[2]);

    if (!texto || texto.length < 2) return;

    const id = href.match(/\/(\d+)/)?.[1];

    if (!id || vistos.has(id)) return;

    const textoRuim =
      texto.toLowerCase().includes("read") ||
      texto.toLowerCase().includes("vote") ||
      texto.toLowerCase().includes("comment");

    if (textoRuim && texto.length < 12) return;

    vistos.add(id);

    capitulos.push({
      wattpadId: id,
      titulo: texto,
      link: `https://www.wattpad.com${href}`,
      palavras: 0,
      paragrafos: 0,
      ordem: capitulos.length + 1,
      tipo: "Normal"
    });
  });

  return capitulos;
}

async function buscarHtml(url) {
  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível acessar a obra no Wattpad.");
  }

  return resposta.text();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  try {
    const { link } = req.body || {};
    const wattpadId = extrairWattpadId(link);

    if (!wattpadId) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Link inválido. Use um link no formato https://www.wattpad.com/story/ID"
      });
    }

    const url = `https://www.wattpad.com/story/${wattpadId}`;
    const html = await buscarHtml(url);

    const dadosJson = extrairDeJsons(html);

    const titulo = dadosJson.titulo || buscarTitulo(html);
    const capa = dadosJson.capa || buscarCapa(html);
    const descricao = dadosJson.descricao || buscarDescricao(html);

    let capitulos = dadosJson.capitulos || [];

    if (!capitulos.length) {
      capitulos = extrairCapitulosPorLinks(html);
    }

    const capitulosLimpos = capitulos
      .filter((capitulo) => capitulo.titulo)
      .map((capitulo, index) => ({
        ...capitulo,
        ordem: Number(capitulo.ordem || index + 1)
      }));

    if (!titulo && capitulosLimpos.length === 0) {
      return res.status(422).json({
        erro: true,
        mensagem:
          "A página foi acessada, mas não foi possível identificar dados da obra. O Wattpad pode ter ocultado os dados no HTML inicial."
      });
    }

    return res.status(200).json({
      sucesso: true,
      fonte: capitulosLimpos.length ? "html/json" : "metadados",
      obra: {
        wattpadId,
        titulo: titulo || `Obra ${wattpadId}`,
        capa,
        descricao,
        link: url
      },
      capitulos: capitulosLimpos,
      totalCapitulos: capitulosLimpos.length,
      aviso:
        capitulosLimpos.length === 0
          ? "A obra foi identificada, mas nenhum capítulo foi encontrado automaticamente. Cadastre os capítulos manualmente nos detalhes da obra."
          : ""
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: true,
      mensagem:
        erro.message || "Erro interno ao importar obra do Wattpad."
    });
  }
}