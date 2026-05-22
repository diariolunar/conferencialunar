const CACHE_TTL_MS = 1000 * 60 * 10;
const RATE_LIMIT_MS = 450;

const cache = globalThis.__wattpadObraCache || new Map();
const rateState = globalThis.__wattpadObraRateState || {
  ultimoRequest: 0
};

globalThis.__wattpadObraCache = cache;
globalThis.__wattpadObraRateState = rateState;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respeitarRateLimit() {
  const agora = Date.now();
  const diferenca = agora - rateState.ultimoRequest;

  if (diferenca < RATE_LIMIT_MS) {
    await esperar(RATE_LIMIT_MS - diferenca);
  }

  rateState.ultimoRequest = Date.now();
}

function pegarCache(chave) {
  const item = cache.get(chave);

  if (!item) return null;

  if (Date.now() - item.criadoEm > CACHE_TTL_MS) {
    cache.delete(chave);
    return null;
  }

  return item.valor;
}

function salvarCache(chave, valor) {
  cache.set(chave, {
    criadoEm: Date.now(),
    valor
  });
}

function extrairIdObra(linkOuId = "") {
  const texto = String(linkOuId || "").trim();

  const matchStory = texto.match(/story\/(\d+)/i);
  if (matchStory?.[1]) return matchStory[1];

  const matchNumero = texto.match(/^(\d{5,})$/);
  if (matchNumero?.[1]) return matchNumero[1];

  return "";
}

async function fetchComTimeout(url, opcoes = {}, timeout = 12000) {
  await respeitarRateLimit();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resposta = await fetch(url, {
      ...opcoes,
      signal: controller.signal
    });

    return resposta;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const cacheKey = `json:${url}`;
  const cacheado = pegarCache(cacheKey);

  if (cacheado) return cacheado;

  const resposta = await fetchComTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Wattpad respondeu com status ${resposta.status}.`);
  }

  const dados = await resposta.json();
  salvarCache(cacheKey, dados);

  return dados;
}

function montarCapitulos(partes = []) {
  return partes.map((parte, index) => ({
    wattpadId: String(parte.id || ""),
    titulo: parte.title || `Capítulo ${index + 1}`,
    link: parte.url
      ? `https://www.wattpad.com${parte.url}`
      : parte.id
        ? `https://www.wattpad.com/${parte.id}`
        : "",
    palavras: Number(parte.wordCount || 0),
    paragrafos: 0,
    comentariosTotais: Number(parte.commentCount || 0),
    distribuicaoComentarios: {
      inicio: 0,
      meio: 0,
      fim: 0,
      geral: 0
    },
    ordem: index + 1,
    tipo: "Normal"
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  try {
    const { linkObra, obraId } = req.body || {};
    const id = extrairIdObra(obraId || linkObra);

    if (!id) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe um link ou ID válido de obra do Wattpad."
      });
    }

    const dados = await fetchJson(
      `https://www.wattpad.com/api/v3/stories/${id}?drafts=0&include_deleted=0`
    );

    const obra = {
      wattpadId: String(dados.id || id),
      titulo: dados.title || "",
      autor: dados.user?.name || "",
      userAutor: dados.user?.username || dados.user?.name || "",
      link: `https://www.wattpad.com/story/${dados.id || id}`,
      capa: dados.cover || "",
      descricao: dados.description || "",
      capitulos: montarCapitulos(dados.parts || [])
    };

    return res.status(200).json({
      sucesso: true,
      obra,
      cache: {
        ativo: true,
        ttlMs: CACHE_TTL_MS
      },
      rateLimit: {
        intervaloMs: RATE_LIMIT_MS
      }
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: true,
      tipo: "WATTPAD_OBRA_FETCH_ERROR",
      mensagem:
        erro.message ||
        "Não foi possível buscar os dados da obra no Wattpad.",
      sugestao:
        "Confira se o link da obra está correto. Se persistir, cadastre manualmente."
    });
  }
}