/**
 * Interface strings, per locale.
 *
 * The original eight keys (`challenges`, `verify`, …) are recovered from
 * git-it-electron's translated `partials/`, so those non-English values were
 * written by a human translator. The remaining chrome keys (welcome screen,
 * nav, finale, search, banners, module/challenge titles live in
 * `challenges.ts`) were translated for this project and approved by the
 * project owner — a locale with no entry falls back to English per key,
 * which is what the original did too.
 *
 * Challenge and page *content* is fully translated for all nine locales in
 * `src/content/`; this file covers the *chrome* around it.
 */

export interface UiStrings {
  challenges: string;
  verify: string;
  selectDirectory: string;
  changeDirectory: string;
  clearStatus: string;
  pathRequired: string;
  checking: string;
  checkAgain: string;
  // --- Home / welcome ------------------------------------------------------
  homeProgressLabel: string;
  homeWelcome: string;
  homeIntro1: string;
  homeIntro2: string;
  homeStart: string;
  homeOnWay: string;
  homePickup: string;
  homeContinue: string;
  homeCongrats: string;
  homeFinished: string;
  homeSeeNext: string;
  homeClearTitle: string;
  homeClearMsg: string;
  // --- Shell nav ------------------------------------------------------------
  navHome: string;
  navDictionary: string;
  navResources: string;
  navAbout: string;
  navAllChallenges: string;
  navDone: string;
  // --- Challenge view --------------------------------------------------------
  notFoundTitle: string;
  notFoundBack: string;
  completedBadge: string;
  /** The "of" in "Challenge 7 of 16" (or "/" for locales without the word). */
  eyebrowOf: string;
  // --- Finale -----------------------------------------------------------------
  finaleTitle: string;
  finaleIntro: string;
  finaleFetching: string;
  finaleNeedsConn: string;
  finaleRetry: string;
  finaleYourPatch: string;
  /** Contains a `{username}` placeholder for the learner's handle. */
  finalePatchDesc: string;
  finaleQuilt: string;
  finalePersonOne: string;
  finalePeopleMany: string;
  finaleEmpty: string;
  finaleNext: string;
  finaleNext1: string;
  finaleNext2: string;
  finaleNext3: string;
  finaleNext4: string;
  finaleSeeOnline: string;
  // --- Pages -------------------------------------------------------------------
  pageAbout: string;
  pageDictionary: string;
  pageResources: string;
  avatarStyles: string;
  avatarDesc: string;
  projectGithub: string;
  reportIssue: string;
  // --- Search --------------------------------------------------------------------
  searchLabel: string;
  searchPlaceholder: string;
  searchTitle: string;
  searchNeedTwo: string;
  /** Contains a `{query}` placeholder. */
  searchNothingMatches: string;
  searchOpen: string;
  searchNavigate: string;
  searchClose: string;
  // --- Misc chrome ---------------------------------------------------------------
  langLabel: string;
  noCheck: string;
  /**
   * Said of a check that is encouraged but does not gate the challenge. It
   * used to read "optional, not checked", which was wrong twice over: the
   * check *is* run, and once it passes the line carries a tick.
   */
  optionalSuffix: string;
  gitMissing: string;
  saveUnreadable: string;
  saveKeptPrefix: string;
  saveKeptSuffix: string;
  dirPromptHome: string;
  dirPromptPractice: string;
}

const EN: UiStrings = {
  challenges: "Challenges",
  verify: "Verify",
  selectDirectory: "Select directory",
  changeDirectory: "Change directory",
  clearStatus: "Clear completed status",
  pathRequired: "Select the repository folder this challenge is about.",
  // No recovered translations for these two: the original had no such
  // strings, so they stay English everywhere rather than being guessed.
  checking: "Checking…",
  checkAgain: "Check again",
  homeProgressLabel: "Challenges completed",
  homeWelcome: "Welcome",
  homeIntro1:
    "Git Gud teaches the terminal, Git and GitHub — not just beginner moves, but the commands you will reach for over and over. Every challenge is checked against your real machine, so finishing one means it actually worked.",
  homeIntro2:
    "It starts from the very beginning: opening a terminal and finding your way around your own computer. Git comes after that, once the window it lives in is familiar. You will need a GitHub account by the second half; a challenge walks you through it.",
  homeStart: "Start challenge one",
  homeOnWay: "On your way",
  homePickup: "Pick up where you left off.",
  homeContinue: "Continue",
  homeCongrats: "Congratulations",
  homeFinished: "You finished every challenge and are primed for social coding.",
  homeSeeNext: "See what is next",
  homeClearTitle: "Clear all progress?",
  homeClearMsg:
    "This clears the completed status for every challenge. Your repositories are not touched.",
  navHome: "Home",
  navDictionary: "Dictionary",
  navResources: "Resources",
  navAbout: "About",
  navAllChallenges: "All challenges",
  navDone: "Done!",
  notFoundTitle: "Challenge not found",
  notFoundBack: "Back to all challenges",
  completedBadge: "Completed",
  eyebrowOf: "of",
  finaleTitle: "Congrats, you did it!",
  finaleIntro:
    "You pull request with the best of them. You now know alternate meanings for the words fork and branch, and you have collaborated with someone — or a robot — elsewhere.",
  finaleFetching: "Fetching the quilt…",
  finaleNeedsConn: "The quilt lives online, so this needs a connection.",
  finaleRetry: "Try again",
  finaleYourPatch: "Your patch",
  finalePatchDesc:
    "Generated just for {username} and stitched into the quilt below. No two are the same.",
  finaleQuilt: "The quilt",
  finalePersonOne: "person has finished",
  finalePeopleMany: "people have finished",
  finaleEmpty: "No patches on the quilt yet. Yours could be the first.",
  finaleNext: "What next?",
  finaleNext1:
    "Make a repository named yourusername.github.io, fill it with web files, and GitHub will host it free at that address.",
  finaleNext2:
    "Open an issue in one of your repositories and break the work into a task list.",
  finaleNext3: "Find projects to contribute to in GitHub Explore.",
  finaleNext4:
    "Go back through any challenge in the sidebar — everything stays available.",
  finaleSeeOnline: "See the quilt online",
  pageAbout: "About",
  pageDictionary: "Dictionary",
  pageResources: "Resources",
  avatarStyles: "Avatar styles",
  avatarDesc:
    "The guide characters are generated with DiceBear (MIT). Each style is by a different artist:",
  projectGithub: "Project on GitHub",
  reportIssue: "Report an issue",
  searchLabel: "Search",
  searchPlaceholder: "Search challenges…",
  searchTitle: "Search challenges",
  searchNeedTwo: "Type at least two characters.",
  searchNothingMatches: "Nothing matches “{query}”.",
  searchOpen: "open",
  searchNavigate: "navigate",
  searchClose: "close",
  langLabel: "Language",
  noCheck: "This challenge has no automatic check.",
  optionalSuffix: "— optional",
  gitMissing:
    "Git was not found on your PATH. Challenge 1 walks you through installing it — the other challenges cannot be verified until it is.",
  saveUnreadable:
    "Your saved progress could not be read, so this session is not being saved to disk.",
  saveKeptPrefix: "The old file was kept as",
  saveKeptSuffix: "in the app data folder.",
  dirPromptHome:
    "Pick your home directory — the folder `pwd` printed when you opened your terminal.",
  dirPromptPractice: "Pick the `gitgud-practice` folder you made.",
};

// Values for the original eight keys are recovered verbatim except for case:
// the original rendered the buttons in capitals (VERIFICAR, VÉRIFIER,
// ПЕРЕВІРИТИ) and this interface does not shout. There is deliberately no
// translation for changeDirectory — the original had no such string, and
// inventing one would be exactly the guessing this table exists to avoid.
const TRANSLATIONS: Record<string, Partial<UiStrings>> = {
  "es-CO": {
    challenges: "Retos",
    homeProgressLabel: "Retos completados",
    homeWelcome: "Bienvenido",
    homeIntro1:
      "Git Gud enseña la terminal, Git y GitHub — no solo los primeros pasos, sino los comandos que usarás una y otra vez. Cada reto se comprueba en tu propia computadora, así que terminar uno significa que realmente funcionó.",
    homeIntro2:
      "Empieza desde cero: abrir una terminal y moverte por tu propia computadora. Git viene después, cuando la ventana en la que vive ya te resulte familiar. Necesitarás una cuenta de GitHub en la segunda mitad; un reto te guía paso a paso.",
    homeStart: "Empezar el primer reto",
    homeOnWay: "Vas en camino",
    homePickup: "Continúa donde lo dejaste.",
    homeContinue: "Continuar",
    homeCongrats: "Felicitaciones",
    homeFinished: "Terminaste todos los retos y estás listo para programar con otras personas.",
    homeSeeNext: "Ver qué sigue",
    homeClearTitle: "¿Borrar todo el progreso?",
    homeClearMsg:
      "Esto borra el estado de completado de todos los retos. Tus repositorios no se tocan.",
    navHome: "Inicio",
    navDictionary: "Diccionario",
    navResources: "Recursos",
    navAbout: "Acerca de",
    navAllChallenges: "Todos los retos",
    navDone: "¡Hecho!",
    notFoundTitle: "Reto no encontrado",
    notFoundBack: "Volver a todos los retos",
    completedBadge: "Completado",
    eyebrowOf: "de",
    finaleTitle: "¡Felicitaciones, lo lograste!",
    finaleIntro:
      "Haces pull requests como los mejores. Ya conoces otros significados de las palabras fork y branch, y has colaborado con alguien — o con un robot — en otro lugar.",
    finaleFetching: "Cargando la colcha…",
    finaleNeedsConn: "La colcha vive en internet, así que necesitas conexión.",
    finaleRetry: "Inténtalo otra vez",
    finaleYourPatch: "Tu parche",
    finalePatchDesc:
      "Generado solo para {username} y cosido en la colcha de abajo. No hay dos iguales.",
    finaleQuilt: "La colcha",
    finalePersonOne: "persona ha terminado",
    finalePeopleMany: "personas han terminado",
    finaleEmpty: "Aún no hay parches en la colcha. El tuyo podría ser el primero.",
    finaleNext: "¿Y ahora qué?",
    finaleNext1:
      "Crea un repositorio llamado tuusuario.github.io, llénalo con archivos web y GitHub lo alojará gratis en esa dirección.",
    finaleNext2:
      "Abre un issue en uno de tus repositorios y divide el trabajo en una lista de tareas.",
    finaleNext3: "Busca proyectos a los que contribuir en GitHub Explore.",
    finaleNext4: "Vuelve a cualquier reto desde la barra lateral — todo sigue disponible.",
    finaleSeeOnline: "Ver la colcha en línea",
    pageAbout: "Acerca de",
    pageDictionary: "Diccionario",
    pageResources: "Recursos",
    avatarStyles: "Estilos de avatar",
    avatarDesc:
      "Los personajes guía se generan con DiceBear (MIT). Cada estilo es de un artista distinto:",
    projectGithub: "Proyecto en GitHub",
    reportIssue: "Reportar un problema",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar retos…",
    searchTitle: "Buscar retos",
    searchNeedTwo: "Escribe al menos dos caracteres.",
    searchNothingMatches: "Sin resultados para “{query}”.",
    searchOpen: "abrir",
    searchNavigate: "navegar",
    searchClose: "cerrar",
    langLabel: "Idioma",
    noCheck: "Este reto no tiene comprobación automática.",
    optionalSuffix: "— opcional",
    gitMissing:
      "No se encontró Git en tu PATH. El reto 1 te guía para instalarlo — los demás retos no se pueden comprobar hasta entonces.",
    saveUnreadable:
      "No se pudo leer tu progreso guardado, así que esta sesión no se está guardando en disco.",
    saveKeptPrefix: "El archivo antiguo se conservó como",
    saveKeptSuffix: "en la carpeta de datos de la aplicación.",
    dirPromptHome:
      "Elige tu directorio personal — la carpeta que mostró `pwd` al abrir tu terminal.",
    dirPromptPractice: "Elige la carpeta `gitgud-practice` que creaste.",
  },
  "es-ES": {
    challenges: "Retos",
    verify: "Verificar",
    selectDirectory: "Selecciona la carpeta",
    clearStatus: "Reiniciar el estado de completado",
    homeProgressLabel: "Retos completados",
    homeWelcome: "Bienvenido",
    homeIntro1:
      "Git Gud enseña la terminal, Git y GitHub — no solo los primeros pasos, sino los comandos que usarás una y otra vez. Cada reto se comprueba en tu propio ordenador, así que terminar uno significa que realmente funcionó.",
    homeIntro2:
      "Empieza desde cero: abrir una terminal y moverte por tu propio ordenador. Git viene después, cuando la ventana en la que vive ya te resulte familiar. Necesitarás una cuenta de GitHub en la segunda mitad; un reto te guía paso a paso.",
    homeStart: "Empezar el primer reto",
    homeOnWay: "Vas en camino",
    homePickup: "Continúa donde lo dejaste.",
    homeContinue: "Continuar",
    homeCongrats: "Enhorabuena",
    homeFinished: "Terminaste todos los retos y estás listo para programar con otras personas.",
    homeSeeNext: "Ver qué sigue",
    homeClearTitle: "¿Borrar todo el progreso?",
    homeClearMsg:
      "Esto borra el estado de completado de todos los retos. Tus repositorios no se tocan.",
    navHome: "Inicio",
    navDictionary: "Diccionario",
    navResources: "Recursos",
    navAbout: "Acerca de",
    navAllChallenges: "Todos los retos",
    navDone: "¡Hecho!",
    notFoundTitle: "Reto no encontrado",
    notFoundBack: "Volver a todos los retos",
    completedBadge: "Completado",
    eyebrowOf: "de",
    finaleTitle: "¡Enhorabuena, lo conseguiste!",
    finaleIntro:
      "Haces pull requests como los mejores. Ya conoces otros significados de las palabras fork y branch, y has colaborado con alguien — o con un robot — en otro lugar.",
    finaleFetching: "Cargando la colcha…",
    finaleNeedsConn: "La colcha vive en internet, así que necesitas conexión.",
    finaleRetry: "Inténtalo de nuevo",
    finaleYourPatch: "Tu parche",
    finalePatchDesc:
      "Generado solo para {username} y cosido en la colcha de abajo. No hay dos iguales.",
    finaleQuilt: "La colcha",
    finalePersonOne: "persona ha terminado",
    finalePeopleMany: "personas han terminado",
    finaleEmpty: "Aún no hay parches en la colcha. El tuyo podría ser el primero.",
    finaleNext: "¿Y ahora qué?",
    finaleNext1:
      "Crea un repositorio llamado tuusuario.github.io, llénalo con archivos web y GitHub lo alojará gratis en esa dirección.",
    finaleNext2:
      "Abre un issue en uno de tus repositorios y divide el trabajo en una lista de tareas.",
    finaleNext3: "Busca proyectos a los que contribuir en GitHub Explore.",
    finaleNext4: "Vuelve a cualquier reto desde la barra lateral — todo sigue disponible.",
    finaleSeeOnline: "Ver la colcha online",
    pageAbout: "Acerca de",
    pageDictionary: "Diccionario",
    pageResources: "Recursos",
    avatarStyles: "Estilos de avatar",
    avatarDesc:
      "Los personajes guía se generan con DiceBear (MIT). Cada estilo es de un artista distinto:",
    projectGithub: "Proyecto en GitHub",
    reportIssue: "Informar de un problema",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar retos…",
    searchTitle: "Buscar retos",
    searchNeedTwo: "Escribe al menos dos caracteres.",
    searchNothingMatches: "Sin resultados para “{query}”.",
    searchOpen: "abrir",
    searchNavigate: "navegar",
    searchClose: "cerrar",
    langLabel: "Idioma",
    noCheck: "Este reto no tiene comprobación automática.",
    optionalSuffix: "— opcional",
    gitMissing:
      "No se encontró Git en tu PATH. El reto 1 te guía para instalarlo — los demás retos no se pueden comprobar hasta entonces.",
    saveUnreadable:
      "No se pudo leer tu progreso guardado, así que esta sesión no se está guardando en disco.",
    saveKeptPrefix: "El archivo antiguo se conservó como",
    saveKeptSuffix: "en la carpeta de datos de la aplicación.",
    dirPromptHome:
      "Elige tu directorio personal — la carpeta que mostró `pwd` al abrir tu terminal.",
    dirPromptPractice: "Elige la carpeta `gitgud-practice` que creaste.",
  },
  "fr-FR": {
    challenges: "Défis",
    verify: "Vérifier",
    selectDirectory: "Sélectionner un répertoire",
    clearStatus: "Effacer le statut terminé",
    homeProgressLabel: "Défis terminés",
    homeWelcome: "Bienvenue",
    homeIntro1:
      "Git Gud vous apprend le terminal, Git et GitHub — pas seulement les premiers pas, mais les commandes que vous utiliserez sans cesse. Chaque défi est vérifié sur votre propre machine, donc en terminer un signifie que cela a vraiment fonctionné.",
    homeIntro2:
      "Tout commence par le tout début : ouvrir un terminal et vous orienter sur votre propre ordinateur. Git vient ensuite, une fois que la fenêtre dans laquelle il vit vous est familière. Vous aurez besoin d'un compte GitHub pour la seconde moitié ; un défi vous guide pas à pas.",
    homeStart: "Commencer le premier défi",
    homeOnWay: "En route",
    homePickup: "Reprenez où vous vous étiez arrêté.",
    homeContinue: "Continuer",
    homeCongrats: "Félicitations",
    homeFinished: "Vous avez terminé tous les défis et êtes prêt pour le code collaboratif.",
    homeSeeNext: "Voir la suite",
    homeClearTitle: "Effacer toute la progression ?",
    homeClearMsg:
      "Cela efface le statut terminé de chaque défi. Vos dépôts ne sont pas modifiés.",
    navHome: "Accueil",
    navDictionary: "Dictionnaire",
    navResources: "Ressources",
    navAbout: "À propos",
    navAllChallenges: "Tous les défis",
    navDone: "Terminé !",
    notFoundTitle: "Défi introuvable",
    notFoundBack: "Retour à tous les défis",
    completedBadge: "Terminé",
    eyebrowOf: "sur",
    finaleTitle: "Bravo, vous l'avez fait !",
    finaleIntro:
      "Vous faites des pull requests comme les meilleurs. Vous connaissez désormais d'autres sens aux mots fork et branch, et vous avez collaboré avec quelqu'un — ou un robot — ailleurs.",
    finaleFetching: "Chargement du patchwork…",
    finaleNeedsConn: "Le patchwork est en ligne, une connexion est donc nécessaire.",
    finaleRetry: "Réessayer",
    finaleYourPatch: "Votre morceau",
    finalePatchDesc:
      "Généré juste pour {username} et cousu dans le patchwork ci-dessous. Il n'y en a pas deux pareils.",
    finaleQuilt: "Le patchwork",
    finalePersonOne: "personne a terminé",
    finalePeopleMany: "personnes ont terminé",
    finaleEmpty: "Aucun morceau sur le patchwork pour l'instant. Le vôtre pourrait être le premier.",
    finaleNext: "Et ensuite ?",
    finaleNext1:
      "Créez un dépôt nommé votrepseudo.github.io, remplissez-le de fichiers web, et GitHub l'hébergera gratuitement à cette adresse.",
    finaleNext2:
      "Ouvrez une issue dans l'un de vos dépôts et découpez le travail en liste de tâches.",
    finaleNext3: "Trouvez des projets auxquels contribuer dans GitHub Explore.",
    finaleNext4: "Revenez à n'importe quel défi depuis la barre latérale — tout reste disponible.",
    finaleSeeOnline: "Voir le patchwork en ligne",
    pageAbout: "À propos",
    pageDictionary: "Dictionnaire",
    pageResources: "Ressources",
    avatarStyles: "Styles d'avatar",
    avatarDesc:
      "Les personnages guides sont générés avec DiceBear (MIT). Chaque style est l'œuvre d'un artiste différent :",
    projectGithub: "Projet sur GitHub",
    reportIssue: "Signaler un problème",
    searchLabel: "Recherche",
    searchPlaceholder: "Rechercher des défis…",
    searchTitle: "Rechercher des défis",
    searchNeedTwo: "Tapez au moins deux caractères.",
    searchNothingMatches: "Aucun résultat pour « {query} ».",
    searchOpen: "ouvrir",
    searchNavigate: "naviguer",
    searchClose: "fermer",
    langLabel: "Langue",
    noCheck: "Ce défi n'a pas de vérification automatique.",
    optionalSuffix: "— facultatif",
    gitMissing:
      "Git est introuvable dans votre PATH. Le défi 1 vous guide pour l'installer — les autres défis ne peuvent pas être vérifiés tant qu'il n'est pas installé.",
    saveUnreadable:
      "Votre progression enregistrée n'a pas pu être lue, cette session n'est donc pas enregistrée sur le disque.",
    saveKeptPrefix: "L'ancien fichier a été conservé sous le nom",
    saveKeptSuffix: "dans le dossier de données de l'application.",
    dirPromptHome:
      "Choisissez votre dossier personnel — le dossier affiché par `pwd` à l'ouverture de votre terminal.",
    dirPromptPractice: "Choisissez le dossier `gitgud-practice` que vous avez créé.",
  },
  "uk-UA": {
    challenges: "Завдання",
    verify: "Перевірити",
    selectDirectory: "Оберіть директорію",
    clearStatus: "Скинути статуси завдань",
    homeProgressLabel: "Виконано завдань",
    homeWelcome: "Вітаємо",
    homeIntro1:
      "Git Gud навчає терміналу, Git і GitHub — не лише перших кроків, а команд, до яких ви повертатиметеся знову і знову. Кожне завдання перевіряється на вашому комп’ютері, тож виконане завдання означає, що все справді спрацювало.",
    homeIntro2:
      "Усе починається з самого початку: відкриття терміналу та орієнтування у власному комп’ютері. Git з’явиться пізніше, коли вікно, в якому він живе, стане знайомим. У другій половині вам знадобиться обліковий запис GitHub; одне із завдань проведе вас через його створення.",
    homeStart: "Почати перше завдання",
    homeOnWay: "Ви вже на шляху",
    homePickup: "Продовжте з того місця, де зупинилися.",
    homeContinue: "Продовжити",
    homeCongrats: "Вітаємо",
    homeFinished: "Ви виконали всі завдання і готові до спільного кодування.",
    homeSeeNext: "Дивіться, що далі",
    homeClearTitle: "Очистити весь прогрес?",
    homeClearMsg:
      "Це очистить статус виконання всіх завдань. Ваші репозиторії не будуть зачеплені.",
    navHome: "Головна",
    navDictionary: "Словник",
    navResources: "Ресурси",
    navAbout: "Про нас",
    navAllChallenges: "Усі завдання",
    navDone: "Готово!",
    notFoundTitle: "Завдання не знайдено",
    notFoundBack: "Назад до всіх завдань",
    completedBadge: "Виконано",
    eyebrowOf: "з",
    finaleTitle: "Вітаємо, ви це зробили!",
    finaleIntro:
      "Ви створюєте pull request нарівні з найкращими. Тепер ви знаєте інші значення слів «форк» і «гілка», і ви вже співпрацювали з кимось — або з роботом — на відстані.",
    finaleFetching: "Завантажуємо ковдру…",
    finaleNeedsConn: "Ковдра живе в інтернеті, тому потрібне з’єднання.",
    finaleRetry: "Спробувати знову",
    finaleYourPatch: "Ваш клаптик",
    finalePatchDesc:
      "Створено саме для {username} і вшито в ковдру нижче. Жодні два не однакові.",
    finaleQuilt: "Ковдра",
    finalePersonOne: "людина завершила",
    finalePeopleMany: "людей завершили",
    finaleEmpty: "На ковдрі поки немає клаптиків. Ваш може стати першим.",
    finaleNext: "Що далі?",
    finaleNext1:
      "Створіть репозиторій з назвою yourusername.github.io, наповніть його вебфайлами, і GitHub безкоштовно хоститиме його за цією адресою.",
    finaleNext2:
      "Відкрийте issue в одному зі своїх репозиторіїв і розбийте роботу на список завдань.",
    finaleNext3: "Шукайте проєкти для внеску в GitHub Explore.",
    finaleNext4: "Повертайтеся до будь-якого завдання через бічну панель — усе залишається доступним.",
    finaleSeeOnline: "Дивитися ковдру онлайн",
    pageAbout: "Про нас",
    pageDictionary: "Словник",
    pageResources: "Ресурси",
    avatarStyles: "Стилі аватарів",
    avatarDesc:
      "Персонажі-провідники згенеровано за допомогою DiceBear (MIT). Кожен стиль — від іншого художника:",
    projectGithub: "Проєкт на GitHub",
    reportIssue: "Повідомити про проблему",
    searchLabel: "Пошук",
    searchPlaceholder: "Шукати завдання…",
    searchTitle: "Пошук завдань",
    searchNeedTwo: "Введіть щонайменше два символи.",
    searchNothingMatches: "Нічого не відповідає “{query}”.",
    searchOpen: "відкрити",
    searchNavigate: "навігація",
    searchClose: "закрити",
    langLabel: "Мова",
    noCheck: "Це завдання не має автоматичної перевірки.",
    optionalSuffix: "— необов’язково",
    gitMissing:
      "Git не знайдено у вашому PATH. Завдання 1 проведе вас через встановлення — інші завдання не можна перевірити, доки його не встановлено.",
    saveUnreadable:
      "Не вдалося прочитати ваш збережений прогрес, тому ця сесія не зберігається на диск.",
    saveKeptPrefix: "Старий файл збережено як",
    saveKeptSuffix: "у папці даних застосунку.",
    dirPromptHome:
      "Оберіть вашу домашню теку — папку, яку показала команда `pwd`, коли ви відкрили термінал.",
    dirPromptPractice: "Оберіть папку `gitgud-practice`, яку ви створили.",
  },
  "ja-JP": {
    homeProgressLabel: "完了したチャレンジ",
    homeWelcome: "ようこそ",
    homeIntro1:
      "Git Gudではターミナル、Git、GitHubを学べます。入門編だけでなく、何度も使うコマンドを身につけられます。すべてのチャレンジは実際のコンピュータでチェックされるので、クリアできたときは本当に動いたということです。",
    homeIntro2:
      "はじめはターミナルを開いて、自分のコンピュータの中を移動するところからスタートします。その画面に慣れたらGitを学びます。後半ではGitHubアカウントが必要になりますが、チャレンジの中で作り方を案内します。",
    homeStart: "チャレンジ1を始める",
    homeOnWay: "学習中です",
    homePickup: "前回の続きから始めましょう。",
    homeContinue: "続ける",
    homeCongrats: "おめでとうございます",
    homeFinished: "すべてのチャレンジをクリアしました。ソーシャルコーディングの準備ができました。",
    homeSeeNext: "次にすることを見る",
    homeClearTitle: "すべての進捗を消去しますか?",
    homeClearMsg: "すべてのチャレンジの完了状態が消去されます。リポジトリには影響しません。",
    navHome: "ホーム",
    navDictionary: "用語集",
    navResources: "リソース",
    navAbout: "概要",
    navAllChallenges: "すべてのチャレンジ",
    navDone: "完了!",
    notFoundTitle: "チャレンジが見つかりません",
    notFoundBack: "チャレンジ一覧に戻る",
    completedBadge: "完了済み",
    eyebrowOf: "/",
    finaleTitle: "おめでとうございます、達成しました!",
    finaleIntro:
      "立派にプルリクエストができるようになりました。forkやbranchという言葉の別の意味を知り、どこかにいる誰か — またはロボット — とコラボレーションしました。",
    finaleFetching: "キルトを取得しています…",
    finaleNeedsConn: "キルトはオンラインにあるため、接続が必要です。",
    finaleRetry: "もう一度試す",
    finaleYourPatch: "あなたのパッチ",
    finalePatchDesc:
      "{username}のために生成され、下のキルトに縫い込まれます。同じものは二つとありません。",
    finaleQuilt: "キルト",
    finalePersonOne: "人が完了しました",
    finalePeopleMany: "人が完了しました",
    finaleEmpty: "キルトにはまだパッチがありません。最初の1枚を作ってみましょう。",
    finaleNext: "次は?",
    finaleNext1:
      "yourusername.github.ioというリポジトリを作り、Webファイルを入れてみましょう。そのアドレスでGitHubが無料で公開してくれます。",
    finaleNext2: "自分のリポジトリにissueを立てて、作業をタスクリストに分けてみましょう。",
    finaleNext3: "GitHub Exploreでコントリビュートできるプロジェクトを探してみましょう。",
    finaleNext4: "サイドバーからいつでもチャレンジに戻れます。",
    finaleSeeOnline: "キルトをオンラインで見る",
    pageAbout: "概要",
    pageDictionary: "用語集",
    pageResources: "リソース",
    avatarStyles: "アバタースタイル",
    avatarDesc:
      "ガイドキャラクターはDiceBear (MIT)で生成されています。各スタイルは異なるアーティストの作品です:",
    projectGithub: "GitHub上のプロジェクト",
    reportIssue: "問題を報告する",
    searchLabel: "検索",
    searchPlaceholder: "チャレンジを検索…",
    searchTitle: "チャレンジを検索",
    searchNeedTwo: "2文字以上入力してください。",
    searchNothingMatches: "「{query}」に一致する結果はありません。",
    searchOpen: "開く",
    searchNavigate: "移動",
    searchClose: "閉じる",
    langLabel: "言語",
    noCheck: "このチャレンジには自動チェックがありません。",
    optionalSuffix: "— 任意",
    gitMissing:
      "PATHにGitが見つかりませんでした。チャレンジ1でインストール方法を案内しています — Gitがインストールされるまで、他のチャレンジは確認できません。",
    saveUnreadable:
      "保存された進捗を読み込めなかったため、このセッションはディスクに保存されません。",
    saveKeptPrefix: "古いファイルは",
    saveKeptSuffix: "としてアプリのデータフォルダに残してあります。",
    dirPromptHome:
      "ホームディレクトリを選んでください — ターミナルを開いたときに`pwd`が表示したフォルダです。",
    dirPromptPractice: "作成した`gitgud-practice`フォルダを選んでください。",
  },
  "ko-KR": {
    homeProgressLabel: "완료한 챌린지",
    homeWelcome: "환영합니다",
    homeIntro1:
      "Git Gud는 터미널, Git, GitHub를 가르쳐 드립니다. 입문용 명령어뿐 아니라 자주 사용하게 될 명령어를 배웁니다. 모든 챌린지는 실제 컴퓨터에서 검사하므로, 완료했다는 것은 정말로 동작했다는 뜻입니다.",
    homeIntro2:
      "가장 처음부터 시작합니다. 터미널을 열고 자신의 컴퓨터를 둘러보는 것부터 시작하세요. 그 창에 익숙해진 뒤에 Git을 배웁니다. 후반부에서는 GitHub 계정이 필요합니다. 챌린지에서 만드는 방법을 안내해 드립니다.",
    homeStart: "첫 번째 챌린지 시작",
    homeOnWay: "진행 중",
    homePickup: "지난번에 멈춘 곳부터 이어서 하세요.",
    homeContinue: "계속하기",
    homeCongrats: "축하합니다",
    homeFinished: "모든 챌린지를 완료하셨고 소셜 코딩을 시작할 준비가 되셨습니다.",
    homeSeeNext: "다음 단계 보기",
    homeClearTitle: "모든 진행 상황을 지울까요?",
    homeClearMsg: "모든 챌린지의 완료 상태가 지워집니다. 리포지토리는 건드리지 않습니다.",
    navHome: "홈",
    navDictionary: "용어집",
    navResources: "학습 자료",
    navAbout: "소개",
    navAllChallenges: "모든 챌린지",
    navDone: "완료!",
    notFoundTitle: "챌린지를 찾을 수 없습니다",
    notFoundBack: "모든 챌린지로 돌아가기",
    completedBadge: "완료됨",
    eyebrowOf: "/",
    finaleTitle: "축하합니다, 해내셨어요!",
    finaleIntro:
      "이제 능숙하게 풀 리퀘스트를 하실 수 있습니다. fork와 branch라는 단어의 또 다른 뜻을 알게 되셨고, 어딘가에 있는 누군가 — 혹은 로봇 — 과 협업해 보셨습니다.",
    finaleFetching: "퀼트를 가져오는 중…",
    finaleNeedsConn: "퀼트는 온라인에 있어서 연결이 필요합니다.",
    finaleRetry: "다시 시도",
    finaleYourPatch: "나의 패치",
    finalePatchDesc:
      "오직 {username}님을 위해 생성되어 아래 퀼트에 꿰매어집니다. 같은 모양은 두 개가 없습니다.",
    finaleQuilt: "퀼트",
    finalePersonOne: "명이 완료했습니다",
    finalePeopleMany: "명이 완료했습니다",
    finaleEmpty: "퀼트에 아직 패치가 없습니다. 첫 번째 패치를 만들어 보세요.",
    finaleNext: "다음은요?",
    finaleNext1:
      "yourusername.github.io라는 리포지토리를 만들고 웹 파일을 채워 보세요. GitHub에서 해당 주소로 무료 호스팅해 줍니다.",
    finaleNext2: "리포지토리 중 하나에 이슈를 열고 작업을 할 일 목록으로 나눠 보세요.",
    finaleNext3: "GitHub Explore에서 기여할 프로젝트를 찾아보세요.",
    finaleNext4: "사이드바에서 언제든 챌린지로 돌아갈 수 있습니다.",
    finaleSeeOnline: "온라인에서 퀼트 보기",
    pageAbout: "소개",
    pageDictionary: "용어집",
    pageResources: "학습 자료",
    avatarStyles: "아바타 스타일",
    avatarDesc:
      "가이드 캐릭터는 DiceBear(MIT)로 생성됩니다. 각 스타일은 서로 다른 아티스트의 작품입니다:",
    projectGithub: "GitHub의 프로젝트",
    reportIssue: "문제 신고하기",
    searchLabel: "검색",
    searchPlaceholder: "챌린지 검색…",
    searchTitle: "챌린지 검색",
    searchNeedTwo: "두 글자 이상 입력하세요.",
    searchNothingMatches: "“{query}”에 대한 결과가 없습니다.",
    searchOpen: "열기",
    searchNavigate: "이동",
    searchClose: "닫기",
    langLabel: "언어",
    noCheck: "이 챌린지에는 자동 검사가 없습니다.",
    optionalSuffix: "— 선택 사항",
    gitMissing:
      "PATH에서 Git을 찾을 수 없습니다. 챌린지 1에서 설치 방법을 안내해 드립니다 — 설치하기 전까지는 다른 챌린지를 확인할 수 없습니다.",
    saveUnreadable:
      "저장된 진행 상황을 읽을 수 없어서 이번 세션은 디스크에 저장되지 않습니다.",
    saveKeptPrefix: "이전 파일은",
    saveKeptSuffix: "이름으로 앱 데이터 폴더에 보관되었습니다.",
    dirPromptHome:
      "홈 디렉터리를 선택하세요 — 터미널을 열었을 때 `pwd`가 출력한 폴더입니다.",
    dirPromptPractice: "직접 만든 `gitgud-practice` 폴더를 선택하세요.",
  },
  "pt-BR": {
    homeProgressLabel: "Desafios concluídos",
    homeWelcome: "Boas-vindas",
    homeIntro1:
      "O Git Gud ensina terminal, Git e GitHub — não só os primeiros passos, mas os comandos que você vai usar o tempo todo. Cada desafio é verificado na sua máquina de verdade, então concluir um significa que realmente funcionou.",
    homeIntro2:
      "Tudo começa do zero: abrir um terminal e se virar no seu próprio computador. O Git vem depois, quando a janela onde ele vive já for familiar. Você vai precisar de uma conta no GitHub na segunda metade; um dos desafios mostra como criar uma.",
    homeStart: "Começar o primeiro desafio",
    homeOnWay: "Você está no caminho",
    homePickup: "Continue de onde parou.",
    homeContinue: "Continuar",
    homeCongrats: "Parabéns",
    homeFinished: "Você concluiu todos os desafios e está pronto para programar em grupo.",
    homeSeeNext: "Ver o que vem a seguir",
    homeClearTitle: "Apagar todo o progresso?",
    homeClearMsg:
      "Isso apaga o status de concluído de todos os desafios. Seus repositórios não serão alterados.",
    navHome: "Início",
    navDictionary: "Dicionário",
    navResources: "Recursos",
    navAbout: "Sobre",
    navAllChallenges: "Todos os desafios",
    navDone: "Feito!",
    notFoundTitle: "Desafio não encontrado",
    notFoundBack: "Voltar para todos os desafios",
    completedBadge: "Concluído",
    eyebrowOf: "de",
    finaleTitle: "Parabéns, você conseguiu!",
    finaleIntro:
      "Você já abre pull request como gente grande. Agora você conhece outros significados para as palavras fork e branch, e já colaborou com alguém — ou com um robô — em outro lugar.",
    finaleFetching: "Buscando a colcha…",
    finaleNeedsConn: "A colcha está online, então é preciso conexão.",
    finaleRetry: "Tentar novamente",
    finaleYourPatch: "Seu retalho",
    finalePatchDesc:
      "Gerado só para {username} e costurado na colcha abaixo. Não existem dois iguais.",
    finaleQuilt: "A colcha",
    finalePersonOne: "pessoa terminou",
    finalePeopleMany: "pessoas terminaram",
    finaleEmpty: "Ainda não há retalhos na colcha. O seu pode ser o primeiro.",
    finaleNext: "E agora?",
    finaleNext1:
      "Crie um repositório chamado seunome.github.io, encha de arquivos web, e o GitHub vai hospedá-lo grátis nesse endereço.",
    finaleNext2: "Abra uma issue em um dos seus repositórios e quebre o trabalho em uma lista de tarefas.",
    finaleNext3: "Encontre projetos para contribuir no GitHub Explore.",
    finaleNext4: "Volte a qualquer desafio pela barra lateral — tudo continua disponível.",
    finaleSeeOnline: "Ver a colcha online",
    pageAbout: "Sobre",
    pageDictionary: "Dicionário",
    pageResources: "Recursos",
    avatarStyles: "Estilos de avatar",
    avatarDesc:
      "Os personagens-guia são gerados com DiceBear (MIT). Cada estilo é de um artista diferente:",
    projectGithub: "Projeto no GitHub",
    reportIssue: "Relatar um problema",
    searchLabel: "Buscar",
    searchPlaceholder: "Buscar desafios…",
    searchTitle: "Buscar desafios",
    searchNeedTwo: "Digite pelo menos dois caracteres.",
    searchNothingMatches: "Nada corresponde a “{query}”.",
    searchOpen: "abrir",
    searchNavigate: "navegar",
    searchClose: "fechar",
    langLabel: "Idioma",
    noCheck: "Este desafio não tem verificação automática.",
    optionalSuffix: "— opcional",
    gitMissing:
      "O Git não foi encontrado no seu PATH. O desafio 1 mostra como instalá-lo — os outros desafios não podem ser verificados até lá.",
    saveUnreadable:
      "Seu progresso salvo não pôde ser lido, então esta sessão não está sendo salva no disco.",
    saveKeptPrefix: "O arquivo antigo foi mantido como",
    saveKeptSuffix: "na pasta de dados do aplicativo.",
    dirPromptHome:
      "Escolha seu diretório home — a pasta que o `pwd` mostrou quando você abriu o terminal.",
    dirPromptPractice: "Escolha a pasta `gitgud-practice` que você criou.",
  },
  "zh-TW": {
    homeProgressLabel: "已完成的挑戰",
    homeWelcome: "歡迎",
    homeIntro1:
      "Git Gud 會教你終端機、Git 和 GitHub — 不只教入門動作,更教你會一再使用的指令。每個挑戰都會在你的真實電腦上檢查,所以完成就代表真的成功了。",
    homeIntro2:
      "我們從頭開始:打開終端機,在自己的電腦中找到方向。熟悉這個視窗之後,再來學 Git。下半部分會需要 GitHub 帳號;會有一個挑戰帶你一步步建立。",
    homeStart: "開始第一個挑戰",
    homeOnWay: "正在進行",
    homePickup: "從上次中斷的地方繼續。",
    homeContinue: "繼續",
    homeCongrats: "恭喜",
    homeFinished: "你完成了所有挑戰,已經準備好進行社交化程式開發了。",
    homeSeeNext: "看看接下來是什麼",
    homeClearTitle: "要清除所有進度嗎?",
    homeClearMsg: "這會清除每個挑戰的完成狀態。不會動到你的儲存庫。",
    navHome: "首頁",
    navDictionary: "字典",
    navResources: "資源",
    navAbout: "關於",
    navAllChallenges: "所有挑戰",
    navDone: "完成!",
    notFoundTitle: "找不到挑戰",
    notFoundBack: "回到所有挑戰",
    completedBadge: "已完成",
    eyebrowOf: "/",
    finaleTitle: "恭喜,你做到了!",
    finaleIntro:
      "你已經能像高手一樣發 pull request 了。你知道了 fork 和 branch 的另一種意思,也和遠方的某個人 — 或機器人 — 合作過了。",
    finaleFetching: "正在取得拼布…",
    finaleNeedsConn: "拼布放在網路上,所以需要連線。",
    finaleRetry: "再試一次",
    finaleYourPatch: "你的拼布片",
    finalePatchDesc: "專為 {username} 產生,並縫進下方的拼布中。每一片都是獨一無二的。",
    finaleQuilt: "拼布",
    finalePersonOne: "人已完成",
    finalePeopleMany: "人已完成",
    finaleEmpty: "拼布上還沒有任何拼布片。你的可以是第一片。",
    finaleNext: "下一步?",
    finaleNext1:
      "建立一個名為 yourusername.github.io 的儲存庫,放入網頁檔案,GitHub 就會在該位址免費代管。",
    finaleNext2: "在你的儲存庫中開一個 issue,把工作拆成任務清單。",
    finaleNext3: "到 GitHub Explore 找可以貢獻的專案。",
    finaleNext4: "隨時可以從側邊欄回到任何挑戰 — 全部都還在。",
    finaleSeeOnline: "在線上查看拼布",
    pageAbout: "關於",
    pageDictionary: "字典",
    pageResources: "資源",
    avatarStyles: "頭像樣式",
    avatarDesc: "引導角色是使用 DiceBear (MIT) 產生的。每種樣式都出自不同藝術家之手:",
    projectGithub: "GitHub 上的專案",
    reportIssue: "回報問題",
    searchLabel: "搜尋",
    searchPlaceholder: "搜尋挑戰…",
    searchTitle: "搜尋挑戰",
    searchNeedTwo: "請至少輸入兩個字元。",
    searchNothingMatches: "找不到「{query}」的相關結果。",
    searchOpen: "開啟",
    searchNavigate: "前往",
    searchClose: "關閉",
    langLabel: "語言",
    noCheck: "這個挑戰沒有自動檢查。",
    optionalSuffix: "— 選填",
    gitMissing:
      "在你的 PATH 中找不到 Git。挑戰 1 會帶你安裝 — 在安裝完成之前,無法驗證其他挑戰。",
    saveUnreadable: "無法讀取你儲存的進度,所以這次工作階段不會儲存到磁碟。",
    saveKeptPrefix: "舊檔案已保留為",
    saveKeptSuffix: ",放在應用程式資料資料夾中。",
    dirPromptHome: "選擇你的家目錄 — 就是打開終端機時 `pwd` 印出的那個資料夾。",
    dirPromptPractice: "選擇你建立的 `gitgud-practice` 資料夾。",
  },
};

export function strings(locale: string): UiStrings {
  return { ...EN, ...(TRANSLATIONS[locale] ?? {}) };
}
