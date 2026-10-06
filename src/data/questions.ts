import type { CategoryId, Intensity, Kind, Method } from '../core/categories';

export interface Question {
  /** Identifiant stable : « catégorie-numéro ». Ne jamais réordonner ni supprimer, seulement ajouter à la fin. */
  id: string;
  text: string;
  category: CategoryId;
  kind: Kind;
  intensity: Intensity;
  method: Method;
  /** Question ajoutée par l'utilisateur. */
  custom?: boolean;
}

/**
 * Banque de questions. Elles sont écrites dans nos propres mots, en tutoyant et sans accord au masculin ou au féminin,
 * à partir de méthodes publiées : « Trois bonnes choses » (Seligman), journal de gratitude (Emmons et McCullough),
 * écriture expressive (Pennebaker), auto-compassion (Neff), relevé de pensées TCC (Beck), pleine conscience
 * (Kabat-Zinn) et clarification des valeurs (ACT). Sources détaillées dans le README.
 *
 * Format de chaque ligne : [intensité, type, texte, méthode?]
 *   intensité : L = légère, D = plus profonde
 *   type      : p = positif, h = difficile, r = réflexion / demain
 */
type Row = ['L' | 'D', 'p' | 'h' | 'r', string, Method?];

const KIND: Record<'p' | 'h' | 'r', Kind> = { p: 'positive', h: 'hard', r: 'reflect' };

function make(category: CategoryId, method: Method, rows: Row[]): Question[] {
  return rows.map(([i, k, text, m], n) => ({
    id: `${category}-${n + 1}`,
    text,
    category,
    kind: KIND[k],
    intensity: i === 'L' ? 'light' : 'deep',
    method: m ?? method,
  }));
}

const gratitude = make('gratitude', 'gratitude', [
  ['L', 'p', 'Quelles sont les trois bonnes choses de ta journée, même toutes petites ?', 'three-good-things'],
  ['L', 'p', 'Qu’est-ce qui t’a fait du bien aujourd’hui ?'],
  ['L', 'p', 'Pour quoi aurais-tu envie de dire merci ce soir ?'],
  ['L', 'p', 'Quelle bonne surprise, même minuscule, as-tu croisée aujourd’hui ?'],
  ['D', 'p', 'Pour l’une de tes bonnes choses du jour, qu’est-ce qui l’a rendue possible ?', 'three-good-things'],
  ['L', 'p', 'Qui a eu un geste gentil envers toi aujourd’hui, même discret ?'],
  ['L', 'p', 'Quel objet, quel lieu ou quel moment de ta journée t’a donné une sensation de confort ?'],
  ['D', 'p', 'Qu’est-ce que tu tiens pour acquis dans ta vie et que tu aimerais remarquer ce soir ?'],
  ['L', 'p', 'Quel détail agréable as-tu remarqué dehors ou chez toi ?'],
  ['D', 'p', 'Quelle personne a changé quelque chose pour toi, et qu’aimerais-tu lui dire ?'],
  ['L', 'p', 'Qu’est-ce qui a été plus facile que prévu aujourd’hui ?'],
  ['L', 'p', 'Quelle chose banale de ton quotidien serait difficile à perdre ?'],
  ['L', 'p', 'Si tu devais garder un seul souvenir de cette journée, lequel choisirais-tu ?'],
  ['D', 'p', 'Qu’est-ce qui est présent dans ta vie aujourd’hui et que tu avais souhaité il y a longtemps ?'],
  ['L', 'p', 'Quel petit confort as-tu apprécié aujourd’hui (un lit, une douche, une boisson chaude…) ?'],
  ['L', 'p', 'Quelle aide, petite ou grande, as-tu reçue aujourd’hui ?'],
]);

const fierte = make('fierte', 'positive', [
  ['L', 'p', 'Qu’est-ce que tu as fait aujourd’hui qui te donne un petit sentiment de fierté ?'],
  ['L', 'p', 'Quel effort, même discret, mérite d’être reconnu ce soir ?'],
  ['L', 'p', 'Qu’est-ce que tu as réussi à faire alors que ce n’était pas facile ?'],
  ['D', 'p', 'Quelle qualité en toi s’est montrée aujourd’hui, et dans quelle situation ?'],
  ['L', 'p', 'As-tu terminé quelque chose aujourd’hui, même minuscule ? Qu’est-ce que ça te fait ?'],
  ['D', 'p', 'Quel petit pas as-tu fait vers quelque chose qui compte pour toi ?'],
  ['L', 'p', 'À quel moment as-tu pris soin de toi aujourd’hui ?'],
  ['D', 'p', 'Qu’est-ce que tu as osé aujourd’hui, même un tout petit peu ?'],
  ['L', 'p', 'Qu’est-ce que tu as appris aujourd’hui, sur toi ou sur le monde ?'],
  ['D', 'p', 'Quelle période difficile as-tu traversée dont tu peux te dire : « j’ai tenu » ?'],
  ['L', 'p', 'Qu’est-ce qu’une personne qui t’apprécie remarquerait de positif dans ta journée ?'],
  ['L', 'p', 'Quelle décision as-tu prise aujourd’hui qui allait dans le bon sens pour toi ?'],
  ['D', 'p', 'Si tu regardais ta journée avec bienveillance, quelle réussite verrais-tu que tu as tendance à ignorer ?'],
  ['L', 'p', 'Quel moment de la journée t’a montré que tu étais capable ?'],
  ['L', 'p', 'Quelle tâche que tu repoussais as-tu enfin commencée, même cinq minutes ?'],
]);

const plaisir = make('plaisir', 'positive', [
  ['L', 'p', 'Quel moment de la journée aurais-tu envie de revivre ?'],
  ['L', 'p', 'Qu’est-ce qui t’a fait sourire ou rire aujourd’hui ?'],
  ['L', 'p', 'Quel plaisir simple t’es-tu accordé aujourd’hui ?'],
  ['L', 'p', 'Qu’as-tu mangé ou bu aujourd’hui qui t’a vraiment fait plaisir ?'],
  ['L', 'p', 'Quelle musique, quel film ou quelle lecture a rendu ta journée plus douce ?'],
  ['L', 'p', 'Quel moment de calme as-tu trouvé aujourd’hui ?'],
  ['L', 'p', 'Qu’est-ce qui a mis un peu de lumière dans ta journée ?'],
  ['L', 'p', 'Quelle activité t’a fait oublier le temps, même quelques minutes ?'],
  ['L', 'p', 'Quel endroit t’a fait du bien aujourd’hui ?'],
  ['D', 'p', 'Qu’est-ce qui te donne de l’énergie en ce moment, et comment lui faire plus de place dans tes semaines ?'],
  ['L', 'p', 'Quelle petite victoire du quotidien as-tu envie de célébrer ?'],
  ['L', 'p', 'Qu’est-ce qui était simplement agréable dans ta journée, sans raison particulière ?'],
  ['L', 'p', 'As-tu profité d’un rayon de soleil, d’un nuage ou d’un bruit de pluie ? Raconte.'],
  ['L', 'p', 'Quelle conversation, même courte, a rendu ta journée meilleure ?'],
  ['D', 'p', 'Quand te sens-tu le plus en vie ? Y a-t-il eu un petit éclat de cela aujourd’hui ?'],
  ['L', 'p', 'Qu’est-ce que tu attends avec plaisir dans les prochains jours ?'],
]);

const relations = make('relations', 'positive', [
  ['L', 'p', 'Avec qui as-tu partagé un bon moment aujourd’hui, même par message ?'],
  ['L', 'p', 'As-tu fait plaisir à quelqu’un aujourd’hui ? Qu’as-tu ressenti ?'],
  ['D', 'p', 'Qui te comprend bien, et comment pourrais-tu lui montrer que cela compte pour toi ?', 'compassion'],
  ['L', 'r', 'Y a-t-il quelqu’un à qui tu penses ce soir ? Qu’aimerais-tu lui dire ?'],
  ['L', 'p', 'Quel geste d’attention as-tu reçu ou donné aujourd’hui ?'],
  ['L', 'h', 'Y a-t-il eu une petite tension avec quelqu’un aujourd’hui ? Comment l’as-tu vécue ?', 'expressive'],
  ['D', 'h', 'Y a-t-il quelque chose que tu n’as pas dit à quelqu’un ? Qu’est-ce qui rendait cela difficile ?', 'expressive'],
  ['D', 'h', 'Une relation te pèse-t-elle en ce moment ? Qu’est-ce qui, précisément, est lourd ?', 'expressive'],
  ['D', 'r', 'De quoi as-tu besoin de la part de ton entourage en ce moment ?', 'compassion'],
  ['L', 'r', 'Avec qui aimerais-tu passer un peu plus de temps cette semaine ?'],
  ['D', 'p', 'Quelle personne t’inspire, et qu’est-ce que tu admires chez elle ?', 'values'],
  ['L', 'r', 'As-tu eu besoin de solitude ou de compagnie aujourd’hui ?', 'mindfulness'],
  ['D', 'r', 'Si tu pouvais demander un geste de gentillesse à quelqu’un demain, lequel serait-ce ?', 'compassion'],
  ['D', 'h', 'Quand as-tu eu l’impression que personne ne comprenait ce que tu vivais ?', 'compassion'],
  ['L', 'r', 'Qui te fait rire facilement, et quand pourrais-tu lui écrire ?'],
  ['L', 'p', 'Qu’as-tu apprécié chez les personnes que tu as croisées aujourd’hui ?'],
]);

const emotions = make('emotions', 'expressive', [
  ['L', 'h', 'Qu’est-ce qui a été un peu difficile aujourd’hui ?'],
  ['L', 'h', 'Quelle émotion a été la plus présente aujourd’hui ? Où la sentais-tu dans ton corps ?', 'mindfulness'],
  ['D', 'h', 'Y a-t-il une émotion que tu as mise de côté aujourd’hui ? Si elle pouvait parler, que dirait-elle ?'],
  ['L', 'h', 'Quel moment de la journée a été le plus lourd, et qu’est-ce qui l’a rendu ainsi ?'],
  ['D', 'h', 'Qu’est-ce qui a fait monter de la colère ou de l’agacement aujourd’hui ?'],
  ['D', 'h', 'De quoi la tristesse parle-t-elle chez toi en ce moment ?'],
  ['L', 'h', 'As-tu ressenti de la fatigue émotionnelle aujourd’hui ? Qu’est-ce qui l’a nourrie ?'],
  ['D', 'h', 'Quelle émotion évites-tu depuis quelque temps ? Qu’est-ce qui te fait peur dans l’idée de la ressentir ?'],
  ['D', 'h', 'Écris librement sur ce qui pèse le plus ce soir, sans te soucier de la forme ni de la ponctuation.'],
  ['L', 'r', 'Si ta journée était une météo, laquelle serait-ce, et pourquoi ?'],
  ['D', 'h', 'Quel événement récent revient dans ta tête ? Qu’est-ce que tu ressens quand tu y penses ?'],
  ['L', 'h', 'Qu’est-ce qui a été frustrant aujourd’hui ?'],
  ['D', 'h', 'Y a-t-il un chagrin, petit ou grand, que tu portes en ce moment ?'],
  ['D', 'h', 'Qu’est-ce que tu aurais besoin d’entendre ce soir ?', 'compassion'],
  ['L', 'h', 'Qu’est-ce qui t’a pesé aujourd’hui, et peux-tu le poser ici, noir sur blanc ?'],
  ['D', 'h', 'Quelle émotion difficile as-tu traversée récemment, et que t’apprend-elle sur ce qui compte pour toi ?', 'values'],
  ['L', 'h', 'As-tu eu envie de pleurer, de crier ou de t’enfuir à un moment ? Que se passait-il ?'],
  ['D', 'h', 'Quelle situation d’aujourd’hui aimerais-tu pouvoir revivre autrement, et que te dirais-tu avec douceur ?', 'compassion'],
]);

const peurs = make('peurs', 'cbt', [
  ['L', 'h', 'Qu’est-ce qui t’inquiète en ce moment ?'],
  ['D', 'h', 'Quelle est l’inquiétude qui revient le plus ? Qu’est-ce qui, concrètement, pourrait arriver ?'],
  ['D', 'h', 'Si cette inquiétude se réalisait, comment ferais-tu face ? Qu’est-ce qui t’aiderait ?'],
  ['L', 'h', 'Y a-t-il une inquiétude que tu peux poser ce soir pour la reprendre demain matin ?'],
  ['D', 'h', 'Quelle peur freine ton élan vers quelque chose qui compte pour toi ?', 'values'],
  ['D', 'h', 'Qu’est-ce qui est vraiment sous ton contrôle dans ce qui t’inquiète, et qu’est-ce qui ne l’est pas ?'],
  ['L', 'h', 'Quelle est la plus petite action possible face à ce qui t’inquiète ?'],
  ['D', 'h', 'Comment vis-tu l’incertitude en ce moment ? Qu’est-ce qui t’aide à la supporter ?', 'mindfulness'],
  ['L', 'h', 'As-tu anticipé quelque chose de négatif aujourd’hui qui ne s’est finalement pas produit ?'],
  ['D', 'h', 'As-tu peur de décevoir quelqu’un en ce moment ? Que dirait une personne bienveillante de cette peur ?', 'compassion'],
  ['L', 'h', 'Dans ton corps, où l’inquiétude se loge-t-elle ce soir ?', 'mindfulness'],
  ['D', 'h', 'Quand as-tu déjà surmonté une peur ? Qu’est-ce qui avait rendu cela possible ?'],
  ['D', 'h', 'Qu’est-ce que tu redoutes dans les jours qui viennent ? Quel soutien pourrait t’aider ?'],
  ['L', 'h', 'De 0 à 10, quel est ton niveau d’inquiétude ce soir ? Qu’est-ce qui l’explique ?'],
]);

const compassion = make('compassion', 'compassion', [
  ['L', 'h', 'Qu’est-ce que tu dirais à quelqu’un que tu aimes s’il vivait ce que tu vis aujourd’hui ?'],
  ['D', 'h', 'Quelle phrase douce aimerais-tu entendre ce soir, et peux-tu te la dire toi-même ?'],
  ['L', 'h', 'Qu’est-ce qui a été difficile aujourd’hui, et comment aimerais-tu qu’on te soutienne ?'],
  ['D', 'h', 'Quelle critique intérieure s’est fait entendre aujourd’hui ? Comment une voix plus tendre la reformulerait-elle ?'],
  ['L', 'h', 'Beaucoup de personnes traversent des moments comme celui d’aujourd’hui. Qu’est-ce que cela change de le savoir ?'],
  ['D', 'h', 'Y a-t-il une erreur ou un regret qui te pèse ? Que pourrais-tu te pardonner ce soir ?'],
  ['L', 'h', 'Quel geste de douceur peux-tu t’offrir maintenant (boisson chaude, respiration, étirement…) ?'],
  ['D', 'h', 'De quoi as-tu besoin en ce moment : du repos, du réconfort, de l’encouragement, de la présence ?'],
  ['D', 'h', 'Si tu parlais à toi-même comme à un enfant que tu aimes, que dirais-tu de ta journée ?'],
  ['L', 'h', 'Dans quelle situation t’es-tu parlé durement aujourd’hui ?'],
  ['D', 'h', 'D’où vient la voix de ton critique intérieur ? Que pourrais-tu lui répondre avec calme ?'],
  ['L', 'h', 'Quelle limite as-tu eu du mal à poser aujourd’hui ? Qu’est-ce qui t’aiderait à la poser demain ?'],
  ['D', 'h', 'Qu’est-ce que tu as fait de mieux que tu ne le crois, compte tenu de tout ce que tu portes ?'],
  ['L', 'h', 'Qu’est-ce qui te ferait du bien là, tout de suite, même un tout petit peu ?'],
  ['D', 'h', 'Quelle partie de toi mérite plus de douceur en ce moment ?'],
  ['L', 'h', 'As-tu attendu beaucoup de toi aujourd’hui ? Qu’est-ce qui serait « assez bien », simplement ?'],
]);

const pensees = make('pensees', 'cbt', [
  ['L', 'h', 'Quelle pensée est revenue plusieurs fois aujourd’hui ?'],
  ['D', 'h', 'Quelle situation a provoqué une émotion forte aujourd’hui ? Quelle pensée est passée juste avant ?'],
  ['D', 'h', 'Quelle pensée automatique est passée dans ta tête ?'],
  ['D', 'h', 'Quels faits soutiennent cette pensée ? Et quels faits ne la soutiennent pas ?'],
  ['D', 'h', 'Cette pensée est-elle un fait ou une interprétation ? Comment la reformulerais-tu de façon plus nuancée ?'],
  ['L', 'h', 'As-tu eu une pensée du type « toujours » ou « jamais » aujourd’hui ? Comment la nuancer ?'],
  ['D', 'h', 'Qu’est-ce qu’une personne qui t’aime dirait de cette pensée ?'],
  ['L', 'h', 'Quelle autre explication possible existe-t-il pour ce qui s’est passé ?'],
  ['D', 'h', 'Quelle serait la pire issue, la meilleure, et la plus probable ?'],
  ['D', 'h', 'Si quelqu’un que tu aimes avait cette pensée, que lui répondrais-tu ?', 'compassion'],
  ['L', 'h', 'Quelle pensée t’a fait du mal aujourd’hui, et que peux-tu lui répondre doucement ?'],
  ['D', 'h', 'Parmi les « je dois » et les « il faut » de ta journée, lesquels viennent vraiment de toi ?'],
  ['D', 'h', 'As-tu deviné les pensées de quelqu’un aujourd’hui ? Qu’est-ce qui prouve ce qu’il pensait ?'],
  ['L', 'h', 'De 0 à 10, à quel point crois-tu cette pensée ce soir ? Et après y avoir réfléchi ?'],
  ['D', 'h', 'Qu’est-ce que cette pensée t’empêche de faire ? Que ferais-tu si elle était moins forte ?'],
  ['L', 'r', 'Quelle pensée aimerais-tu garder pour demain, parce qu’elle t’est utile ?', 'positive'],
]);

const corps = make('corps', 'mindfulness', [
  ['L', 'r', 'Comment va ton corps ce soir ? Où y a-t-il de la tension, où y a-t-il de l’aisance ?'],
  ['L', 'r', 'Qu’est-ce qui t’a donné de l’énergie aujourd’hui, et qu’est-ce qui t’en a pris ?'],
  ['L', 'r', 'As-tu bougé aujourd’hui ? Comment ton corps l’a-t-il vécu ?'],
  ['L', 'p', 'Qu’as-tu mangé ou bu qui a fait du bien à ton corps ?'],
  ['L', 'r', 'À quel moment as-tu eu un coup de fatigue ? De quoi aurait-il eu besoin ?'],
  ['D', 'r', 'Qu’est-ce que ton corps essaie de te dire en ce moment ?'],
  ['L', 'r', 'Comment était ta respiration aujourd’hui, plutôt calme ou plutôt courte ?'],
  ['L', 'r', 'As-tu pris le temps de t’hydrater, de manger, de faire une pause ?'],
  ['D', 'r', 'Quel rythme de sommeil te ferait du bien cette semaine ?'],
  ['L', 'r', 'Qu’est-ce qui pourrait t’aider à bien dormir ce soir ?'],
  ['L', 'r', 'Où as-tu ressenti du stress dans ton corps aujourd’hui (mâchoire, épaules, ventre…) ?'],
  ['L', 'r', 'Quel petit mouvement ferait du bien à ton corps ce soir ?'],
  ['D', 'p', 'Quelle partie de ton corps aimerais-tu remercier pour ce qu’elle fait pour toi ?', 'gratitude'],
  ['L', 'r', 'Sur une échelle de 0 à 10, comment est ton énergie physique, et que lui faudrait-il ?'],
]);

const valeurs = make('valeurs', 'values', [
  ['D', 'r', 'Qu’est-ce qui comptait le plus pour toi aujourd’hui ? L’as-tu vécu ?'],
  ['D', 'r', 'Quelle valeur (honnêteté, curiosité, gentillesse, courage, liberté…) as-tu eu envie de vivre aujourd’hui ?'],
  ['D', 'r', 'Quelle personne veux-tu être dans les moments difficiles ? Qu’est-ce que cela change dans ton comportement ?'],
  ['L', 'p', 'Quelle action d’aujourd’hui allait dans le sens de ce qui compte pour toi ?'],
  ['D', 'r', 'Qu’est-ce qui donne du sens à tes journées en ce moment ?'],
  ['D', 'r', 'Si personne ne te jugeait, qu’aimerais-tu faire plus souvent ?'],
  ['L', 'p', 'Qu’as-tu fait aujourd’hui qui te ressemble vraiment ?'],
  ['D', 'r', 'Quel domaine de ta vie (relations, travail, santé, loisirs, apprentissages) a besoin d’un peu plus d’attention ?'],
  ['D', 'r', 'Qu’est-ce que tu veux défendre, même quand c’est difficile ?'],
  ['D', 'r', 'Dans quelle direction veux-tu aller, sans forcément avoir un but précis à atteindre ?'],
  ['L', 'r', 'Qu’est-ce que tu admires chez les autres, et que dit-il de tes propres valeurs ?'],
  ['D', 'r', 'Dans cinq ans, qu’aimerais-tu pouvoir dire de la façon dont tu as vécu cette période ?'],
]);

const presence = make('presence', 'mindfulness', [
  ['L', 'p', 'Quel moment d’aujourd’hui as-tu vécu pleinement, sans être ailleurs dans ta tête ?'],
  ['L', 'r', 'Quels sons, odeurs ou couleurs as-tu remarqués aujourd’hui ?'],
  ['L', 'r', 'Que ressens-tu là, maintenant, en écrivant ces lignes ?'],
  ['L', 'p', 'Quelle gorgée, quelle bouchée ou quelle respiration as-tu savourée aujourd’hui ?'],
  ['D', 'r', 'Quand ton esprit est parti vers le passé ou le futur aujourd’hui, comment l’as-tu ramené doucement ?'],
  ['L', 'r', 'Quel est le bruit le plus doux que tu entends en ce moment ?'],
  ['L', 'p', 'Quel instant ordinaire de ta journée mérite d’être remarqué ?'],
  ['D', 'r', 'Peux-tu regarder tes pensées de ce soir comme des nuages qui passent ? Lesquelles passent vite, lesquelles s’accrochent ?'],
  ['L', 'r', 'Après trois respirations lentes, qu’est-ce qui change dans ton corps ou dans ta tête ?'],
  ['L', 'p', 'Quel détail de ton environnement te fait du bien en ce moment ?'],
  ['D', 'r', 'Qu’est-ce que tu observes de toi-même aujourd’hui, sans chercher à le juger ?'],
  ['L', 'r', 'À quel moment de la journée étais-tu en pilote automatique ? Qu’aurais-tu aimé remarquer ?'],
]);

const demain = make('demain', 'positive', [
  ['L', 'r', 'Qu’est-ce que tu attends de demain, même une toute petite chose ?'],
  ['L', 'r', 'Quelle est la chose la plus importante demain, et quelle serait sa version la plus simple ?'],
  ['L', 'r', 'Qu’est-ce qui pourrait rendre ta journée de demain un peu plus agréable ?'],
  ['D', 'r', 'Qu’aimerais-tu faire autrement demain, avec douceur ?'],
  ['L', 'r', 'Quelle petite chose peux-tu préparer ce soir pour faciliter demain ?'],
  ['L', 'r', 'Quelle intention aimerais-tu poser pour demain (calme, curiosité, patience…) ?', 'values'],
  ['D', 'r', 'Qu’est-ce que tu aimerais garder de cette journée pour demain ?'],
  ['L', 'r', 'Y a-t-il quelque chose que tu peux laisser derrière toi ce soir ?', 'mindfulness'],
  ['D', 'r', 'De quoi as-tu besoin demain pour avoir du soutien ?', 'compassion'],
  ['L', 'p', 'Quel moment de plaisir peux-tu prévoir demain ?'],
  ['D', 'r', 'Si demain se passait un peu mieux qu’aujourd’hui, à quoi cela ressemblerait-il ?'],
  ['L', 'r', 'Quelle sera la première chose que tu feras demain matin pour bien commencer ?'],
  ['D', 'r', 'Quel petit engagement envers toi-même peux-tu prendre pour la semaine ?', 'values'],
  ['L', 'r', 'Qu’est-ce que tu pourrais te dire demain matin pour t’encourager ?', 'compassion'],
  ['D', 'r', 'Y a-t-il une conversation ou une décision que tu repousses ? Quel serait un premier pas minuscule ?'],
  ['L', 'r', 'Quelle heure de coucher te ferait du bien ce soir ?'],
]);

export const QUESTION_BANK: Question[] = [
  ...gratitude,
  ...fierte,
  ...plaisir,
  ...relations,
  ...emotions,
  ...peurs,
  ...compassion,
  ...pensees,
  ...corps,
  ...valeurs,
  ...presence,
  ...demain,
];

export const QUESTION_BY_ID = new Map(QUESTION_BANK.map((q) => [q.id, q]));
