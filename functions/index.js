const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
