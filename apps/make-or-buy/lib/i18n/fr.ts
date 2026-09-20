import type { MakeOrBuyDictionary } from './en';

/**
 * French dictionary. Typed against the English one, so a key that is missing or
 * misspelled here is a compile error rather than a blank space on screen.
 *
 * The vocabulary is the one used in French procurement teaching: produire ou
 * acheter, seuil d’indifférence, coûts fixes évitables. Not a translation of
 * the English wording but the terms a French reader already has.
 *
 * Every apostrophe is typographic. The straight one is a programmer's quote
 * mark, and a page that mixes the two looks like two people wrote it.
 */
export const fr: MakeOrBuyDictionary = {
  meta: {
    title: 'Calculateur produire ou acheter',
    // Espace fine insécable avant le point d'interrogation, comme partout
    // ailleurs sur la page.
    tab: 'Produire ou acheter ?',
    description:
      'Comparez le coût annuel complet d’une pièce produite en interne et celui de son achat, rendement, outillage, droits de douane et remises quantitatives compris, et trouvez le volume à partir duquel l’arbitrage change.',
  },

  app: {
    tool: 'Produire ou acheter',
    language: 'Langue',
    currency: 'Devise',
  },

  intro: {
    title: 'Calculateur produire ou acheter',
    lead: 'Chiffrez une pièce des deux côtés : en interne avec son rebut, son outillage et son coût d’opportunité, ou achetée avec son transport, ses droits et ses remises. Puis trouvez le volume où l’option la moins chère bascule.',
  },

  sections: {
    verdict: 'Verdict coût',
    breakdown: 'Décomposition des coûts',
    chart: 'Coût total selon le volume',
    inputs: 'Données',
  },

  tabs: {
    label: 'Résultats',
    verdict: 'Verdict',
    volume: 'Coût selon le volume',
  },


  verdict: {
    make: 'PRODUIRE',
    buy: 'ACHETER',
    indifferent: 'INDIFFÉRENT',
    atVolume: 'À',
    cheaperBy: 'de moins par an',
    perUnitSaving: 'par unité',
    sameCost: 'les deux coûtent autant',
    unitMake: 'Coût unitaire en interne',
    unitBuy: 'Coût unitaire fournisseur',
    flipPrice: 'Prix d’indifférence',
    flipPriceNote: 'En dessous de ce prix fournisseur, l’achat l’emporte.',
  },

  breakdown: {
    line: 'Poste de coût',
    perUnit: 'Par unité',
    annual: 'Par an',
    make: 'Produire',
    buy: 'Acheter',
    total: 'Total de décision',
    makeLines: {
      materials: 'Matières directes',
      labor: 'Main-d’œuvre directe',
      variableOverhead: 'Frais variables de production',
      scrapLoss: 'Rebut et perte de rendement',
      fixedCosts: 'Coûts fixes',
      tooling: 'Outillage, amorti',
      opportunityCost: 'Coût d’opportunité de la capacité',
    },
    buyLines: {
      purchasePrice: 'Prix d’achat',
      freight: 'Transport',
      duty: 'Droits de douane',
      inspection: 'Réception et contrôle',
      switching: 'Coût de changement, étalé',
    },
    caption: 'Tous les postes de coût des deux options, par unité et par an',
  },

  chart: {
    title: 'Coût annuel total de la production et de l’achat, selon le volume annuel',
    axisVolume: 'Volume annuel',
    axisCost: 'Coût',
    make: 'Produire',
    buy: 'Acheter',
    currentVolume: 'Votre volume',
    crossing: 'Seuil',
    cheaperHere: 'moins cher',
    tableDifference: 'Écart',
    summaryCrossing:
      'Deux courbes de coût selon le volume annuel. Elles se croisent à {crossing} unités par an : en dessous, {below} revient moins cher ; au-dessus, {above} revient moins cher. Au volume saisi, {current} unités, {verdict} revient moins cher.',
    summaryNoCrossing:
      'Deux courbes de coût selon le volume annuel. Elles ne se croisent pas : {dominant} revient moins cher à tout volume. Au volume saisi, {current} unités, l’écart est de {gap}.',
  },

  breakEven: {
    heading: 'Seuil d’indifférence',
    aboveMake: 'Au-dessus de {volume} unités par an, produire revient moins cher.',
    aboveBuy: 'Au-dessus de {volume} unités par an, acheter revient moins cher.',
    betweenMake: 'Entre {low} et {high} unités par an, produire revient moins cher.',
    betweenBuy: 'Entre {low} et {high} unités par an, acheter revient moins cher.',
    noneMake: 'Pas de seuil. Produire revient moins cher à tout volume.',
    noneBuy: 'Pas de seuil. Acheter revient moins cher à tout volume.',
    noneEither: 'Pas de seuil. Les deux coûtent autant à tout volume.',
    several: 'L’arbitrage change {count} fois, parce qu’une remise fait chuter le prix.',
    rounding: 'Arrondi à l’unité supérieure.',
    distance: 'Votre volume en est à {gap} unités.',
  },


  groups: {
    shared: 'Les deux options',
    make: 'Produire en interne',
    buy: 'Acheter à un fournisseur',
    makeVariable: 'Par unité',
    makeFixed: 'Par an',
    makeCapacity: 'Capacité mobilisée',
    buyPrice: 'Prix',
    buyLanded: 'Mise à quai',
  },

  fields: {
    annualVolume: {
      label: 'Volume annuel',
      unit: 'unités/an',
      hint: 'Unités bonnes nécessaires par an. Les deux options sont chiffrées à ce volume.',
    },
    horizonYears: {
      label: 'Horizon d’analyse',
      unit: 'ans',
      hint: 'Les coûts ponctuels, comme l’investissement en outillage, sont étalés sur cette durée.',
    },

    materialsPerUnit: {
      label: 'Matières directes',
      unit: 'par unité',
      hint: 'Coût matière d’une unité lancée.',
    },
    laborHoursPerUnit: {
      label: 'Main-d’œuvre directe',
      unit: 'heures/unité',
      hint: 'Heures de main-d’œuvre directe par unité lancée.',
    },
    laborRatePerHour: {
      label: 'Taux horaire',
      unit: 'par heure',
      hint: 'Coût horaire chargé de cette main-d’œuvre.',
    },
    variableOverheadPerUnit: {
      label: 'Frais variables',
      unit: 'par unité',
      hint: 'Énergie, consommables et tout ce qui croît avec chaque unité produite.',
    },
    yieldPercent: {
      label: 'Rendement',
      unit: '% bonnes',
      hint: 'Unités bonnes sur unités lancées. Le coût est engagé sur chaque unité lancée, y compris celles rebutées : le coût par unité bonne est donc le coût variable divisé par le rendement.',
    },
    fixedCosts: {
      label: 'Coûts fixes',
      unit: 'par an',
      hint: 'Coût fixe qui disparaît si la pièce est achetée : un superviseur dédié, une machine en location, une ligne qui serait arrêtée. Les frais généraux qui subsistent dans les deux cas n’ont pas leur place ici : un coût qui ne varie pas avec la décision ne peut pas l’éclairer.',
    },
    toolingInvestment: {
      label: 'Investissement outillage',
      unit: 'ponctuel',
      hint: 'Gabarits, moules et équipements achetés pour cette pièce, amortis linéairement sur l’horizon.',
    },
    opportunityCostPerYear: {
      label: 'Coût d’opportunité',
      unit: 'par an',
      hint: 'Marge abandonnée ailleurs en affectant cette capacité à cette pièce. Un coût réel de la production, qui ne figure sur aucune facture.',
    },

    supplierPrice: {
      label: 'Prix fournisseur',
      unit: 'par unité',
      hint: 'Prix unitaire coté, dans votre devise, avant toute remise.',
    },
    freightPerUnit: {
      label: 'Transport',
      unit: 'par unité',
      hint: 'Transport amont par unité.',
    },
    dutyPercent: {
      label: 'Droits de douane',
      unit: '% du prix',
      hint: 'Calculés sur le prix d’achat, pas sur le transport.',
    },
    inspectionPerUnit: {
      label: 'Réception et contrôle',
      unit: 'par unité',
      hint: 'Manutention à réception et contrôle qualité par unité.',
    },
  },


  actions: {
    loadExample: 'Charger l’exemple',
    clearAll: 'Tout effacer',
  },

  issues: {
    'must-be-non-negative': 'Saisissez zéro ou plus.',
    'must-be-positive': 'Saisissez une valeur supérieure à zéro.',
    'yield-out-of-range': 'Saisissez un rendement supérieur à 0 et au plus 100.',
    'percent-out-of-range': 'Saisissez un pourcentage entre 0 et 100.',
    'at-least-one-year': 'Saisissez au moins une année.',
  },


  empty: {
    title: 'Rien à comparer pour le moment',
    message:
      'Saisissez le volume annuel, puis ce que coûte une unité de chaque côté. Le verdict, la décomposition et le graphique apparaissent à la frappe.',
  },

  units: {
    perYear: 'unités/an',
    perUnit: 'par unité',
    units: 'unités',
    years: 'ans',
  },

  a11y: {
    skipToInputs: 'Aller aux données',
    inputRail: 'Données',
    chartRegion: 'Graphique du seuil d’indifférence',
    verdictRegion: 'Verdict coût',
    breakdownRegion: 'Décomposition des coûts',
  },

};
