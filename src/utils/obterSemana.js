export function obterInicioDaSemana(data = new Date()) {
  const dataBase = new Date(data);
  const dia = dataBase.getDay();

  const diferencaParaSegunda = dia === 0 ? -6 : 1 - dia;

  dataBase.setDate(dataBase.getDate() + diferencaParaSegunda);
  dataBase.setHours(0, 0, 0, 0);

  return dataBase;
}

export function obterFimDaSemana(data = new Date()) {
  const inicio = obterInicioDaSemana(data);
  const fim = new Date(inicio);

  fim.setDate(inicio.getDate() + 4);
  fim.setHours(23, 59, 59, 999);

  return fim;
}

export function formatarDataChave(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function obterChaveSemana(data = new Date()) {
  const inicio = obterInicioDaSemana(data);
  const fim = obterFimDaSemana(data);

  return `${formatarDataChave(inicio)}__${formatarDataChave(fim)}`;
}

export function obterLabelSemana(data = new Date()) {
  const inicio = obterInicioDaSemana(data);
  const fim = obterFimDaSemana(data);

  return `${formatarDataChave(inicio)} até ${formatarDataChave(fim)}`;
}