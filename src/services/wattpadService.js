export async function buscarObraWattpad({ linkObra = "", obraId = "" }) {
  const resposta = await fetch("/api/wattpad/obra-detalhes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      linkObra,
      obraId
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok || dados.erro) {
    throw new Error(
      dados.mensagem ||
        "Não foi possível buscar a obra no Wattpad."
    );
  }

  return dados.obra;
}