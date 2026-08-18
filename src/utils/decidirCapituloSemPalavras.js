function obterLinkSeguro(link = "") {
  const texto = String(link || "").trim();

  return /^https:\/\/(?:www\.)?wattpad\.com\/\d+/i.test(texto) ? texto : "";
}

export async function decidirCapituloSemPalavras({
  dialog,
  capitulo = {},
  link = "",
  tentativa = 1
}) {
  const linkSeguro = obterLinkSeguro(link);

  return dialog.confirm({
    title: "Capítulo com 0 palavras",
    message:
      `O capítulo "${capitulo.titulo || "Sem título"}" retornou 0 palavras` +
      `${tentativa > 1 ? ` na tentativa ${tentativa}` : ""}.\n\n` +
      "Abra o capítulo para conferir. Depois escolha se deseja tentar novamente ou ignorar este capítulo nas próximas atualizações.",
    confirmLabel: "Tentar novamente",
    confirmValue: "tentar_novamente",
    cancelLabel: "Ignorar",
    cancelValue: "ignorar",
    linkUrl: linkSeguro,
    linkLabel: "Abrir capítulo"
  });
}
