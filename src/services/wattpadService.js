export async function importarObraDoWattpad(link) {
  const resposta = await fetch("/api/wattpad/capitulos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ link })
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || "Erro ao importar obra do Wattpad.");
  }

  return dados;
}