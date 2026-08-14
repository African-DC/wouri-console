/** Vocabulaire des alertes, partagé par la liste, la fiche et la création. */

export const LIBELLES_STATUT: Record<
  string,
  { label: string; tone: "neutre" | "positif" | "attention" | "info" }
> = {
  draft: { label: "Brouillon", tone: "neutre" },
  scheduled: { label: "Programmée", tone: "info" },
  sending: { label: "En diffusion", tone: "positif" },
  completed: { label: "Terminée", tone: "neutre" },
  canceled: { label: "Annulée", tone: "attention" },
};

/** Les quatre façons de désigner une audience, côté backend. */
export const LIBELLES_CIBLAGE: Record<string, string> = {
  zone: "Zone",
  crop: "Culture",
  group: "Groupe",
  farmer: "Agriculteur",
};

export const CIBLAGES = [
  { value: "zone" as const, label: "Zone" },
  { value: "crop" as const, label: "Culture" },
  { value: "group" as const, label: "Groupe" },
  { value: "farmer" as const, label: "Agriculteur" },
];

/* Étapes de diffusion, dans l'ordre où une livraison les traverse. « created »
   signifie que la livraison existe côté WOURI mais n'est pas encore partie : la
   passerelle WhatsApp n'est pas branchée, et l'entonnoir doit le dire plutôt que
   de laisser croire à un envoi. */
export const ETAPES_DIFFUSION = [
  { cle: "created", label: "Créées", aide: "Prêtes à partir, en attente de la passerelle" },
  { cle: "scheduled", label: "Programmées", aide: "Départ planifié" },
  { cle: "sent", label: "Envoyées", aide: "Remises à l'opérateur" },
  { cle: "delivered", label: "Délivrées", aide: "Reçues sur le téléphone" },
  { cle: "read", label: "Lues", aide: "Ouvertes par l'agriculteur" },
  { cle: "replied", label: "Réponses", aide: "Ont ouvert une conversation" },
  { cle: "failed", label: "Échecs", aide: "Non remises" },
] as const;
