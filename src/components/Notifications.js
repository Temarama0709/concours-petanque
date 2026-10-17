import React, { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase.js";
import { Button } from "./ui/button.js";
import { IconBell, IconX } from "./ui/icons.js";

// Cloche des notifications (ex. inscription validée), avec notification du téléphone
// si la personne l'a autorisée et que l'application est ouverte
export default function Notifications({ user, classeBouton }) {
  const [items, setItems] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const connues = useRef(null);

  useEffect(() => {
    connues.current = null;
    return onSnapshot(
      query(collection(db, "notifications", user.uid, "items"), orderBy("createdAt", "desc")),
      (s) => {
        const liste = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Nouvelle notification arrivée pendant que l'application est ouverte : notification système
        if (connues.current && "Notification" in window && Notification.permission === "granted") {
          liste.filter((n) => !n.lu && !connues.current.has(n.id)).forEach((n) => {
            try {
              new Notification(n.titre, { body: n.texte, icon: "/icon-192.png" });
            } catch {
              navigator.serviceWorker?.ready.then((r) => r.showNotification(n.titre, { body: n.texte, icon: "/icon-192.png" }));
            }
          });
        }
        connues.current = new Set(liste.map((n) => n.id));
        setItems(liste);
      },
      () => setItems([])
    );
  }, [user.uid]);

  const nonLues = items.filter((n) => !n.lu).length;
  const permission = "Notification" in window ? Notification.permission : "unsupported";

  const ouvrir = () => {
    setOuvert(!ouvert);
    if (!ouvert) items.filter((n) => !n.lu).forEach((n) => updateDoc(doc(db, "notifications", user.uid, "items", n.id), { lu: true }));
  };

  return (
    <>
      <button type="button" aria-label={`Notifications${nonLues ? ` (${nonLues} non lues)` : ""}`} title="Notifications" onClick={ouvrir} className={`relative ${classeBouton}`}>
        <IconBell />
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-jaune text-navy text-xs font-black flex items-center justify-center">
            {nonLues}
          </span>
        )}
      </button>
      {ouvert && (
        <div className="fixed inset-0 z-[1300] bg-black/50 flex items-start justify-center pt-16 px-4" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-modal="true" aria-label="Notifications" onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white text-navy rounded-xl p-4 space-y-3 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-black uppercase tracking-wider">Notifications</h2>
              <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)} className="w-11 h-11 rounded-[10px] bg-fond flex items-center justify-center"><IconX /></button>
            </div>
            {permission === "default" && (
              <div className="rounded-[10px] bg-jaune-clair p-3 text-sm space-y-2">
                <p>Recevez une alerte sur ce téléphone quand votre inscription est validée.</p>
                <Button size="sm" variant="navy" onClick={() => Notification.requestPermission().then(() => setOuvert(false))}>Activer les alertes</Button>
              </div>
            )}
            {items.length === 0 && <p className="text-sm text-ardoise">Aucune notification.</p>}
            <ul className="divide-y-[1.5px] divide-bord">
              {items.map((n) => (
                <li key={n.id} className="py-2 flex gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{n.titre}</p>
                    <p className="text-sm text-ardoise">{n.texte}</p>
                  </div>
                  <button type="button" aria-label="Supprimer la notification" onClick={() => deleteDoc(doc(db, "notifications", user.uid, "items", n.id))} className="text-ardoise self-start p-1"><IconX size={16} /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
