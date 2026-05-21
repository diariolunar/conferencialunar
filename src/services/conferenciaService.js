import { buscarComentariosDoCapitulo } from "./comentariosService.js";
import { calcularConferencia } from "../utils/calcularConferencia.js";

export async function verificarLeiturasPreparadas({
  leituras,
  userLeitor,
  regras
}) {
  const resultados = [];

  for (const leitura of leituras) {
    const comentariosEncontrados =
      await buscarComentariosDoCapitulo({
        linkCapitulo: leitura.link,
        userLeitor
      });

    const resultado = calcularConferencia({
      capitulo: leitura,
      comentarios: comentariosEncontrados,
      regras
    });

    resultados.push({
      ...leitura,
      resultado
    });
  }

  return resultados;
}