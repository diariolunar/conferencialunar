function extrairIdCapitulo(linkCapitulo = "") {
  const texto = String(linkCapitulo || "").trim();

  const match = texto.match(/wattpad\.com\/(\d+)/i);

  if (match?.[1]) {
    return match[1];
  }

  const matchNumero = texto.match(/(\d{5,})/);

  if (matchNumero?.[1]) {
    return matchNumero[1];
  }

  return "";
}

function limparHtml(texto = "") {
  return String(texto || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarUser(user = "") {
  return String(user || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
}

function detectarPosicao(index, total) {
  if (total <= 1) {
    return "inicio";
  }

  const percentual = index / Math.max(total - 1, 1);

  if (percentual <= 0.33) {
    return "inicio";
  }

  if (percentual <= 0.66) {
    return "meio";
  }

  return "fim";
}

function procurarComentariosEmObjeto(objeto, userLeitor, encontrados = []) {
  if (!objeto || typeof objeto !== "object") {
    return encontrados;
  }

  const userNormalizado = normalizarUser(userLeitor);

  const possivelTexto =
    objeto.comment ||
    objeto.body ||
    objeto.text ||
    objeto.message ||
    objeto.content ||
    "";

  const possivelUsuario =
    objeto.user?.username ||
    objeto.user?.name ||
    objeto.author?.username ||
    objeto.author?.name ||
    objeto.username ||
    "";

  const id =
    objeto.id ||
    objeto.commentId ||
    objeto.annotationId ||
    crypto.randomUUID();

  const timestampBruto =
    objeto.createDate ||
    objeto.createdAt ||
    objeto.modifyDate ||
    objeto.updatedAt ||
    objeto.timestamp ||
    null;

  const timestamp = timestampBruto
    ? new Date(timestampBruto).getTime()
    : Date.now();

  const link =
    objeto.url ||
    objeto.link ||
    "";

  if (
    possivelTexto &&
    possivelUsuario &&
    normalizarUser(possivelUsuario) === userNormalizado
  ) {
    encontrados.push({
      id: String(id),
      texto: limparHtml(possivelTexto),
      usuario: possivelUsuario,
      link,
      timestamp,
      posicao: "meio"
    });
  }

  if (Array.isArray(objeto)) {
    objeto.forEach((item) =>
      procurarComentariosEmObjeto(item, userLeitor, encontrados)
    );
  } else {
    Object.values(objeto).forEach((valor) =>
      procurarComentariosEmObjeto(valor, userLeitor, encontrados)
    );
  }

  return encontrados;
}

function extrairJsonsDaPagina(html = "") {
  const jsons = [];

  const nextData = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (nextData?.[1]) {
    try {
      jsons.push(JSON.parse(nextData[1]));
    } catch {
      // ignora
    }
  }

  const scriptsJson = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  scriptsJson.forEach((script) => {
    try {
      jsons.push(JSON.parse(script[1]));
    } catch {
      // ignora
    }
  });

  return jsons;
}

function organizarComentarios(comentarios = []) {
  const ordenados = comentarios
    .filter((comentario) => comentario.texto)
    .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

  return ordenados.map((comentario, index) => ({
    ...comentario,
    posicao: comentario.posicao || detectarPosicao(index, ordenados.length),
    link: comentario.link || ""
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
    const { linkCapitulo, userLeitor } = req.body || {};

    if (!linkCapitulo) {
      return res.status(400).json({
        erro: true,
        mensagem: "Link do capítulo não informado."
      });
    }

    if (!userLeitor) {
      return res.status(400).json({
        erro: true,
        mensagem: "User do leitor não informado."
      });
    }

    const capituloId = extrairIdCapitulo(linkCapitulo);

    if (!capituloId) {
      return res.status(400).json({
        erro: true,
        mensagem: "Não foi possível identificar o ID do capítulo."
      });
    }

    const url = `https://www.wattpad.com/${capituloId}`;

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
      return res.status(resposta.status).json({
        erro: true,
        mensagem: "Não foi possível acessar o capítulo no Wattpad."
      });
    }

    const html = await resposta.text();
    const jsons = extrairJsonsDaPagina(html);

    let comentarios = [];

    jsons.forEach((json) => {
      comentarios = procurarComentariosEmObjeto(json, userLeitor, comentarios);
    });

    comentarios = organizarComentarios(comentarios);

    return res.status(200).json({
      sucesso: true,
      capituloId,
      comentarios,
      total: comentarios.length,
      aviso:
        comentarios.length === 0
          ? "Nenhum comentário foi identificado automaticamente. O Wattpad pode ocultar comentários no HTML inicial."
          : ""
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: true,
      mensagem: "Erro interno ao buscar comentários do Wattpad."
    });
  }
}