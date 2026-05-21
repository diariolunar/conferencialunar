const USAR_COMENTARIOS_MOCK = false;

function gerarComentarioMock(posicao, index) {
  return {
    id: crypto.randomUUID(),
    texto: `Comentário mock ${index + 1}`,
    posicao,
    link: "https://www.wattpad.com/",
    timestamp: Date.now() + index * 120000
  };
}

async function buscarComentariosMock({ linkCapitulo, userLeitor }) {
  console.log("Buscando comentários MOCK:", {
    linkCapitulo,
    userLeitor
  });

  await new Promise((resolve) => {
    setTimeout(resolve, 800);
  });

  return [
    gerarComentarioMock("inicio", 0),
    gerarComentarioMock("meio", 1),
    gerarComentarioMock("fim", 2),
    gerarComentarioMock("meio", 3),
    gerarComentarioMock("fim", 4),
    gerarComentarioMock("inicio", 5)
  ];
}

async function buscarComentariosApiReal({ linkCapitulo, userLeitor }) {
  const resposta = await fetch("/api/wattpad/comentarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      linkCapitulo,
      userLeitor
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao buscar comentários.");
  }

  return dados.comentarios || [];
}

export async function buscarComentariosDoCapitulo({
  linkCapitulo,
  userLeitor
}) {
  if (USAR_COMENTARIOS_MOCK) {
    return buscarComentariosMock({
      linkCapitulo,
      userLeitor
    });
  }

  return buscarComentariosApiReal({
    linkCapitulo,
    userLeitor
  });
}