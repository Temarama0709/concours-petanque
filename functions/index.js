const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

admin.initializeApp();

exports.setAdmin = functions.https.onCall(async (data, context) => {
  // Tu peux restreindre ici à ton propre UID si tu veux
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Accès refusé.");
  }

  const uid = data.uid;

  await admin.auth().setCustomUserClaims(uid, { admin: true });

  return { message: `L'utilisateur ${uid} est maintenant admin.` };
});

// --- E-mails d'inscription -------------------------------------------------
// Serveur d'envoi (SMTP), par ex. Brevo : smtps://IDENTIFIANT:CLE@smtp-relay.brevo.com:465
// À enregistrer une fois : npx firebase-tools functions:secrets:set SMTP_URL
const SMTP_URL = defineSecret("SMTP_URL");
// Adresse d'expédition, validée chez le fournisseur SMTP (demandée au premier déploiement)
const EMAIL_EXPEDITEUR = defineString("EMAIL_EXPEDITEUR", {
  description: "Adresse d'expédition des e-mails, ex. Concours Pétanque <contact@mondomaine.fr>"
});
const SITE = "https://petanque-concours.web.app";

const echapper = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const dateFr = (iso) => {
  const [a, m, j] = String(iso).split("-").map(Number);
  if (!a) return iso;
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  });
};

// À chaque inscription : e-mail à l'organisateur, et confirmation à l'équipe si elle a donné son e-mail
exports.notifierInscription = onDocumentCreated(
  { document: "inscriptions/{id}", secrets: [SMTP_URL] },
  async (event) => {
    const ins = event.data?.data();
    if (!ins) return;
    const db = admin.firestore();
    const [concoursSnap, contactSnap, autresSnap] = await Promise.all([
      db.doc(`concours/${ins.concoursId}`).get(),
      db.doc(`contacts/${ins.concoursId}`).get(),
      db.collection("inscriptions").where("concoursId", "==", ins.concoursId).count().get()
    ]);
    const concours = concoursSnap.data();
    const organisateur = contactSnap.data()?.email;
    if (!concours || !organisateur) {
      console.warn("Inscription sans concours ou sans e-mail d'organisateur", event.params.id);
      return;
    }

    const transport = nodemailer.createTransport(SMTP_URL.value());
    const from = EMAIL_EXPEDITEUR.value();
    const quand = dateFr(concours.date);
    const ou = `${concours.lieu}, ${concours.cp} ${concours.ville}`;
    const total = autresSnap.data().count;
    const joueurs = ins.joueurs.map(echapper).join("<br>");

    await transport.sendMail({
      from,
      to: organisateur,
      replyTo: ins.email || undefined,
      subject: `Nouvelle inscription : ${concours.title} (${quand})`,
      text:
        `Nouvelle inscription pour « ${concours.title} », ${quand}, ${ou}.\n\n` +
        `Joueurs : ${ins.joueurs.join(", ")}\n` +
        (ins.club ? `Club : ${ins.club}\n` : "") +
        `Téléphone : ${ins.telephone}\n` +
        (ins.email ? `E-mail : ${ins.email}\n` : "") +
        `\nÉquipes inscrites à ce jour : ${total}\n\n${SITE}`,
      html:
        `<p>Nouvelle inscription pour <b>${echapper(concours.title)}</b><br>${echapper(quand)} · ${echapper(ou)}</p>` +
        `<p><b>Joueurs</b><br>${joueurs}</p>` +
        (ins.club ? `<p><b>Club</b> : ${echapper(ins.club)}</p>` : "") +
        `<p><b>Téléphone</b> : ${echapper(ins.telephone)}` +
        (ins.email ? `<br><b>E-mail</b> : ${echapper(ins.email)}` : "") +
        `</p><p>Équipes inscrites à ce jour : <b>${total}</b></p>` +
        `<p style="color:#4F5B6E">Vous recevez cet e-mail car vous avez publié ce concours sur <a href="${SITE}">Concours Pétanque</a>.</p>`
    });

    if (ins.email) {
      await transport.sendMail({
        from,
        to: ins.email,
        replyTo: organisateur,
        subject: `Inscription enregistrée : ${concours.title}`,
        text:
          `Votre inscription au concours « ${concours.title} » (${quand}, ${ou}) a bien été transmise à l'organisateur.\n` +
          `Pour toute question, répondez simplement à cet e-mail.\n\n${SITE}`,
        html:
          `<p>Votre inscription au concours <b>${echapper(concours.title)}</b> a bien été transmise à l'organisateur.</p>` +
          `<p>${echapper(quand)}<br>${echapper(ou)}</p>` +
          `<p>Pour toute question, répondez simplement à cet e-mail.</p>`
      });
    }
  }
);
