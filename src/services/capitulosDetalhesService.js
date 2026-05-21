export async function buscarDetalhesCapituloWattpad({
  capituloId,
  linkCapitulo,
  userLeitor = ""
}) {
  const resposta = await fetch("/api/wattpad/capitulo-detalhes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      capituloId,
      linkCapitulo,
      userLeitor
    })
  });

  const textoResposta = await resposta.text();

  if (!textoResposta) {
    throw new Error("A API de detalhes do capítulo não respondeu.");
  }

  let dados;

  try {
    dados = JSON.parse(textoResposta);
  } catch {
    throw new Error("A API de detalhes retornou uma resposta inválida.");
  }

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || "Erro ao buscar detalhes do capítulo."
    );
  }

  return dados;
}