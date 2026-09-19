import type { Dictionary } from './en';

/**
 * French dictionary, written in the vocabulary a French-language supply chain
 * course actually uses: quantité économique de commande, coût de passation,
 * coût de possession, point de commande, stock de sécurité, taux de service.
 * Typed as Dictionary, so a missing key fails the build.
 */
export const fr: Dictionary = {
  meta: {
    title: 'Quantité économique de commande',
    description:
      'Combien commander à la fois, et ce que coûte une commande hors optimum. Calculé dans le navigateur.',
  },

  app: {
    name: 'Calculateur de commande de stock',
    tool: 'Commande de stock',
    language: 'Langue',
    currency: 'Devise',
  },

  actions: {
    loadExample: 'Charger un exemple',
    clear: 'Vider les champs',
  },

  sections: {
    demandAndCost: 'Demande et coûts',
    workingYear: 'Année de travail',
    safetyStock: 'Stock de sécurité',
    results: 'Résultats',
    chart: 'Courbe de coût',
    penalty: 'Coût d’une quantité de commande erronée',
  },

  tabs: {
    overview: 'Commande et cycle',
    chart: 'Courbe de coût',
    sensitivity: 'Sensibilité',
    /** Names the tab list for anyone not seeing it. */
    label: 'Vues',
  },

  fields: {
    annualDemand: { symbol: 'D', label: 'Demande annuelle' },
    orderCost: { symbol: 'S', label: 'Coût de passation par commande' },
    holdingCostPerUnit: { symbol: 'H', label: 'Coût de possession unitaire' },
    holdingRate: { symbol: 'i', label: 'Taux de possession' },
    unitCost: { symbol: 'C', label: 'Coût d’achat unitaire' },
    daysPerYear: { symbol: '', label: 'Jours ouvrés par an' },
    safetyStock: { symbol: 'SS', label: 'Stock de sécurité conservé' },
  },

  holdingMode: {
    legend: 'Coût de possession exprimé en',
    perUnit: 'Montant par unité',
    rate: 'Taux sur le coût unitaire',
    derived: 'H = i × C',
  },

  results: {
    quantity: 'Quantité économique de commande',
    quantityShort: 'Q*',
    ordersPerYear: 'Commandes par an',
    daysBetween: 'Jours entre commandes',
    relevantCost: 'Coût total pertinent',
    relevantCostShort: 'CTP',
    purchaseCost: 'Coût d’achat',
    totalCost: 'Coût annuel total',
    averageInventory: 'Stock moyen',
    safetyStock: 'Stock de sécurité',
    closedForm: 'Coût de possession des stocks',
    orderWhole: 'Commander en unités entières : arrondir à',
    beforeRounding: 'avant arrondi',
  },

  units: {
    units: 'unités',
    unitsPerYear: 'unités/an',
    unitsPerDay: 'unités/jour',
    unitsPerWeek: 'unités/semaine',
    ordersPerYear: 'commandes/an',
    days: 'jours',
    weeks: 'semaines',
    perOrder: 'par commande',
    perUnitYear: 'par unité/an',
    perUnit: 'par unité',
    perYear: 'par an',
    percent: '%',
    percentOfUnitCost: '% du coût unitaire',
  },

  penalty: {
    caption:
      'La courbe de coût est plate autour de son minimum. Commander à 20 % de Q* coûte environ 2 % de plus.',
    columns: {
      ratio: 'Q / Q*',
      quantity: 'Q',
      relevantCost: 'CTP',
      penalty: 'Surcoût',
    },
    optimum: 'Optimum',
  },

  profile: {
    title: 'Évolution du stock',
    cycle: 'Cycle',
    axisTime: 'Temps',
    axisLevel: 'Stock disponible',
    tableCaption: 'Niveau de stock à chaque événement',
    tableEvent: 'Événement',
    tableTime: 'Temps',
    tableLevel: 'Stock disponible',
    eventStart: 'Début de cycle, stock reconstitué',
    eventDelivery: 'Stock de sécurité atteint, réception',
  },

  chart: {
    title: 'Coût annuel en fonction de la quantité commandée',
    xAxis: 'Quantité commandée',
    yAxis: 'Coût annuel',
    ordering: 'passation',
    holding: 'possession',
    total: 'total',
    optimum: 'Q*',
    readoutHint:
      'Déplacez le curseur sur le graphique pour lire le coût à une quantité donnée.',
    readoutQuantity: 'À Q',
    readoutCost: 'Coût',
    readoutPenalty: 'Écart à l’optimum',
    tableCaption: 'Valeurs de la courbe de coût',
    tableQuantity: 'Quantité commandée',
    tableOrdering: 'Coût de passation',
    tableHolding: 'Coût de possession',
    tableTotal: 'Coût total',
  },

  errors: {
    required: 'Saisissez une valeur',
    'not-a-number':
      'Nombre non reconnu. Utilisez des chiffres, avec une virgule ou un point pour les décimales.',
    'must-be-positive': 'Doit être supérieur à 0',
    'must-be-non-negative': 'Doit être supérieur ou égal à 0',
    'rate-out-of-range': 'Doit être supérieur à 0 et au plus égal à 100',
  },

  empty: {
    headline: 'Rien à calculer pour l’instant',
    needs: 'Encore nécessaire :',
  },

  a11y: {
    skipToResults: 'Aller aux résultats',
    inputRail: 'Données saisies',
    resultsRegion: 'Résultats',
    tabs: 'Vues',
    chartRegion: 'Courbe de coût',
  },
};
