import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../firebase/config.js";

const CONFIG_COLLECTION = "configuracoes";
const REGRAS_DOCUMENT = "regrasPadrao";

export const REGRAS_PADRAO = {
  minimoNormal: 6,
  minimoCurto: 1,
  minimoLongo: 12,
  minimoEspecial: 1,
  minimoPoesia: 3,
  palavrasCapituloCurto: 500,
  palavrasCapituloLongo: 4000,
  palavrasPorMinuto: 200,
  exigeDistribuicaoNormal: true
};

export async function buscarRegrasPadrao() {
  const ref = doc(db, CONFIG_COLLECTION, REGRAS_DOCUMENT);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await salvarRegrasPadrao(REGRAS_PADRAO);
    return REGRAS_PADRAO;
  }

  return {
    ...REGRAS_PADRAO,
    ...snapshot.data()
  };
}

export async function salvarRegrasPadrao(regras) {
  const ref = doc(db, CONFIG_COLLECTION, REGRAS_DOCUMENT);

  await setDoc(
    ref,
    {
      ...REGRAS_PADRAO,
      ...regras,
      atualizadoEm: serverTimestamp()
    },
    { merge: true }
  );
}