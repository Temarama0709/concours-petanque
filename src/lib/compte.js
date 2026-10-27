import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { annulerMonInscription } from "./inscriptions.js";

// Suppression complète d'un compte (droit à l'effacement) :
// inscriptions, notifications, profil, demande et compte contributeur, puis le compte lui-même.
// Les concours publiés restent en ligne (informations publiques), sans lien avec la personne.
export async function supprimerMonCompte(user, motDePasse) {
  // Firebase exige une connexion récente pour supprimer un compte
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, motDePasse));

  const inscriptions = await getDocs(query(collection(db, "inscriptions"), where("uid", "==", user.uid)));
  for (const d of inscriptions.docs) await annulerMonInscription({ id: d.id, ...d.data() });

  const notifications = await getDocs(collection(db, "notifications", user.uid, "items"));
  for (let i = 0; i < notifications.docs.length; i += 400) {
    const batch = writeBatch(db);
    notifications.docs.slice(i, i + 400).forEach((n) => batch.delete(n.ref));
    await batch.commit();
  }

  for (const chemin of ["demandes", "contributeurs", "utilisateurs"]) {
    await deleteDoc(doc(db, chemin, user.uid));
  }
  await deleteUser(user);
}
