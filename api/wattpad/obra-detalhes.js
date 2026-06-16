import importarCapitulosHandler from "./capitulos.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      erro: true,
      mensagem: "Método não permitido. Use POST."
    });
  }

  const { linkObra = "", obraId = "", link = "" } = req.body || {};

  req.body = {
    ...req.body,
    link: link || linkObra || obraId
  };

  return importarCapitulosHandler(req, res);
}
