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

// --- Paiement des crédits (Stripe) ------------------------------------------
// 1 crédit = 1 concours publié. Clés à enregistrer une fois :
//   npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY      (sk_live_… ou sk_test_…)
//   npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET  (whsec_…)
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const Stripe = require("stripe");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
// Offres : prix en centimes. À garder identique à src/lib/offres.js (affichage).
const OFFRES = {
  unite: { credits: 1, prix: 200, nom: "Publication d'un concours", description: "1 concours publié sur Concours Pétanque" },
  pack10: { credits: 10, prix: 1600, nom: "Pack 10 concours", description: "10 concours publiés sur Concours Pétanque (1,60 € le concours)" }
};
const QUANTITE_MAX = 20;

// Crée une page de paiement Stripe pour acheter des crédits ; renvoie son adresse.
// Paramètres : { offre: "unite" | "pack10", quantite }
exports.creerPaiement = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Connectez-vous pour acheter des crédits.");
  const offre = OFFRES[request.data?.offre];
  const quantite = Number(request.data?.quantite ?? 1);
  if (!offre) throw new HttpsError("invalid-argument", "Offre inconnue.");
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
    throw new HttpsError("invalid-argument", `Choisissez une quantité entre 1 et ${QUANTITE_MAX}.`);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY.value());
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: quantite,
        price_data: {
          currency: "eur",
          unit_amount: offre.prix,
          product_data: { name: offre.nom, description: offre.description }
        }
      }
    ],
    client_reference_id: request.auth.uid,
    customer_email: request.auth.token.email || undefined,
    // Nombre total de crédits fixé ici, côté serveur : le navigateur ne choisit que l'offre et la quantité
    metadata: { uid: request.auth.uid, credits: String(offre.credits * quantite) },
    success_url: `${SITE}/?paiement=ok`,
    cancel_url: `${SITE}/?paiement=annule`
  });
  return { url: session.url };
});

// Appelé par Stripe après un paiement : ajoute les crédits (une seule fois par paiement)
exports.webhookStripe = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET.value());
  } catch (error) {
    console.warn("Signature Stripe invalide", error.message);
    res.status(400).send("Signature invalide");
    return;
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    res.json({ recu: true });
    return;
  }
  const session = event.data.object;
  if (session.payment_status !== "paid") {
    res.json({ recu: true, enAttente: true });
    return;
  }
  const uid = session.metadata?.uid;
  const quantite = Number(session.metadata?.credits);
  if (!uid || !Number.isInteger(quantite) || quantite < 1) {
    console.error("Paiement sans uid ou nombre de crédits", session.id);
    res.status(400).send("Métadonnées manquantes");
    return;
  }

  const db = admin.firestore();
  const paiementRef = db.doc(`paiements/${session.id}`);
  const contributeurRef = db.doc(`contributeurs/${uid}`);
  await db.runTransaction(async (tx) => {
    const [dejaTraite, contributeur, demande] = await Promise.all([
      tx.get(paiementRef),
      tx.get(contributeurRef),
      tx.get(db.doc(`demandes/${uid}`))
    ]);
    if (dejaTraite.exists) return; // Stripe peut renvoyer le même événement
    const maintenant = admin.firestore.FieldValue.serverTimestamp();
    if (contributeur.exists) {
      tx.update(contributeurRef, { credits: admin.firestore.FieldValue.increment(quantite), updatedAt: maintenant });
    } else {
      // Premier achat : le compte devient contributeur automatiquement
      const infos = demande.exists ? demande.data() : {};
      tx.set(contributeurRef, {
        email: session.customer_details?.email || infos.email || "",
        nom: infos.nom || session.customer_details?.name || "",
        club: infos.club || "",
        telephone: infos.telephone || "",
        credits: quantite,
        illimite: false,
        createdAt: maintenant,
        updatedAt: maintenant
      });
      if (demande.exists) tx.delete(demande.ref);
    }
    tx.set(paiementRef, {
      uid,
      credits: quantite,
      montant: session.amount_total,
      devise: session.currency,
      email: session.customer_details?.email || "",
      createdAt: maintenant
    });
  });
  res.json({ recu: true });
});
