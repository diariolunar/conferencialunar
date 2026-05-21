function extrairIdCapitulo(linkOuId = "") {
  const texto = String(linkOuId || "").trim();

  const matchWattpad = texto.match(/wattpad\.com\/(\d+)/i);

  if (matchWattpad?.[1]) {
    return matchWattpad[1];
  }

  const matchNumero = texto.match(/^(\d{5,})$/);

  if (matchNumero?.[1]) {
    return matchNumero[1];
  }

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

function contarPalavras(html = "") {
  const texto = limparHtml(html);

  if (!texto) {
    return 0;
  }

  return texto.match(/\S+/g)?.length || 0;
}

function extrairParagrafosDoHtml(html = "") {
  const matches = [...String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];

  return matches
    .map((match, index) => {
      const tagCompleta = match[0];
      const conteudo = match[1];

      const id =
        tagCompleta.match(/data-p-id=["']([^"']+)["']/i)?.[1] ||
        tagCompleta.match(/id=["']([^"']+)["']/i)?.[1] ||
        "";

      return {
        id,
        indice: index,
        texto: limparHtml(conteudo),
        palavras: contarPalavras(conteudo)
      };
    })
    .filter((paragrafo) => paragrafo.texto);
}

function classificarPosicao(indice, total) {
  if (total <= 1) {
    return "inicio";
  }

  const percentual = indice / Math.max(total - 1, 1);

  if (percentual <= 0.33) {
    return "inicio";
  }

  if (percentual <= 0.66) {
    return "meio";
  }

  return "fim";
}

async function fetchTextoCapitulo(capituloId) {
  const url = `https://www.wattpad.com/apiv2/?m=storytext&id=${capituloId}`;

  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível buscar o texto do capítulo.");
  }

  return resposta.text();
}

async function fetchParagrafosApi(capituloId) {
  const url = `https://www.wattpad.com/v4/parts/${capituloId}/paragraphs`;

  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    return [];
  }

  const dados = await resposta.json();

  return Array.isArray(dados.paragraphs) ? dados.paragraphs : [];
}

function combinarParagrafos(paragrafosHtml = [], paragrafosApi = []) {
  const total = Math.max(paragrafosHtml.length, paragrafosApi.length);

  const combinados = [];

  for (let index = 0; index < total; index += 1) {
    const html = paragrafosHtml[index] || {};
    const api = paragrafosApi[index] || {};

    combinados.push({
      id: api.id || html.id || "",
      indice: index,
      texto: html.texto || "",
      palavras: Number(html.palavras || 0),
      commentCount: Number(api.commentCount || 0),
      posicao: classificarPosicao(index, total)
    });
  }

  return combinados;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  try {
    const { capituloId, linkCapitulo } = req.body || {};

    const id = extrairIdCapitulo(capituloId || linkCapitulo);

    if (!id) {
      return res.status(400).json({
        erro: true,
        mensagem: "ID ou link do capítulo não informado."
      });
    }

    const [html, paragrafosApi] = await Promise.all([
      fetchTextoCapitulo(id),
      fetchParagrafosApi(id)
    ]);

    const paragrafosHtml = extrairParagrafosDoHtml(html);
    const paragrafos = combinarParagrafos(paragrafosHtml, paragrafosApi);

    const palavras = paragrafos.reduce(
      (total, paragrafo) => total + Number(paragrafo.palavras || 0),
      0
    );

    const comentariosTotais = paragrafos.reduce(
      (total, paragrafo) => total + Number(paragrafo.commentCount || 0),
      0
    );

    const distribuicaoComentarios = {
      inicio: paragrafos
        .filter((paragrafo) => paragrafo.posicao === "inicio")
        .reduce((total, paragrafo) => total + Number(paragrafo.commentCount || 0), 0),

      meio: paragrafos
        .filter((paragrafo) => paragrafo.posicao === "meio")
        .reduce((total, paragrafo) => total + Number(paragrafo.commentCount || 0), 0),

      fim: paragrafos
        .filter((paragrafo) => paragrafo.posicao === "fim")
        .reduce((total, paragrafo) => total + Number(paragrafo.commentCount || 0), 0)
    };

    return res.status(200).json({
      sucesso: true,
      capituloId: id,
      palavras,
      paragrafos: paragrafos.length,
      comentariosTotais,
      distribuicaoComentarios,
      paragrafosDetalhados: paragrafos
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: true,
      mensagem: erro.message || "Erro interno ao buscar detalhes do capítulo."
    });
  }
}