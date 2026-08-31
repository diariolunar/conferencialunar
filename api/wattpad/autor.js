function canonicalizarUser(valor = "") {
  return String(valor || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  const user = canonicalizarUser(req.body?.user);

  if (!user) {
    return res.status(400).json({
      erro: true,
      mensagem: "User do autor não informado."
    });
  }

  try {
    const resposta = await fetch(
      `https://www.wattpad.com/api/v3/users/${encodeURIComponent(user)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    if (!resposta.ok) {
      return res.status(resposta.status === 404 ? 404 : 502).json({
        erro: true,
        mensagem: "Perfil do autor não encontrado no Wattpad."
      });
    }

    const perfil = await resposta.json();

    return res.status(200).json({
      sucesso: true,
      perfil: {
        user: perfil.username || user,
        nome: perfil.name || "",
        avatar: perfil.avatar || "",
        descricao: perfil.description || "",
        linkPerfil: perfil.deeplink || `https://www.wattpad.com/user/${user}`,
        seguidores: Number(perfil.numFollowers || 0),
        seguindo: Number(perfil.numFollowing || 0),
        historiasPublicadas: Number(perfil.numStoriesPublished || 0),
        verificado: Boolean(perfil.verified),
        privado: Boolean(perfil.isPrivate),
        atualizadoEm: perfil.modifyDate || ""
      }
    });
  } catch (erro) {
    console.error(erro);
    return res.status(502).json({
      erro: true,
      mensagem: "Não foi possível buscar o perfil do autor no Wattpad."
    });
  }
}
