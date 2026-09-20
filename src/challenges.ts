/**
 * The challenges, in order, grouped into modules.
 *
 * Replaces git-it-electron's `empty-data.json` plus the numeric filename
 * prefixes its build script parsed (`7_branches_arent_just_for_birds.html`).
 * Order lives here; prev/next is derived, not stored, so the two can never
 * disagree the way they could in the original.
 *
 * Modules exist because the terminal is not Git. Someone who has never opened
 * a terminal cannot start at "make a repository", and burying five shell
 * lessons in the same flat list as eleven Git ones hides which is which. The
 * sidebar groups by module; numbering stays global so a learner and this file
 * are always talking about the same "challenge 7".
 */

export interface Module {
  id: string;
  title: string;
  /** One line under the group heading. Sets expectations before the click. */
  blurb: string;
}

export const MODULES: Module[] = [
  {
    id: "terminal",
    title: "The Terminal",
    blurb: "The black window, and how to talk to it.",
  },
  {
    id: "files",
    title: "Files & Folders",
    blurb: "Finding your way around, and making things.",
  },
  {
    id: "git",
    title: "Git & GitHub",
    blurb: "Version control, and sharing your work.",
  },
];

export interface Challenge {
  /** Stable key. Matches the `user-data.json` key and the verify module name. */
  id: string;
  /** Display title, hand-written — the original derived these from filenames
   *  and then had a `grammarize()` function to undo the damage. */
  title: string;
  /** Source filename under `content/<locale>/challenges/`. */
  file: string;
  /** Whether the challenge asks the user to pick a directory. */
  needsDirectory: boolean;
  /**
   * What to ask for when picking one. The default says "repository", which is
   * right for the Git challenges and wrong for the terminal ones — those want
   * your home directory and a practice folder, neither of which is a repo.
   */
  dirPrompt?: string;
  /** Which `MODULES` entry this belongs to. */
  module: string;
}

export const CHALLENGES: Challenge[] = [
  // --- The Terminal --------------------------------------------------------
  {
    id: "meet_the_terminal",
    title: "Meet the Terminal",
    file: "t1_meet_the_terminal.html",
    needsDirectory: false,
    module: "terminal",
  },
  {
    id: "command_performance",
    title: "Command Performance",
    file: "t2_command_performance.html",
    needsDirectory: false,
    module: "terminal",
  },

  // --- Files & Folders -----------------------------------------------------
  {
    id: "you_are_here",
    title: "You Are Here",
    file: "f1_you_are_here.html",
    needsDirectory: true,
    dirPrompt: "Pick your home directory — the folder `pwd` printed when you opened your terminal.",
    module: "files",
  },
  {
    id: "there_and_back_again",
    title: "There and Back Again",
    file: "f2_there_and_back_again.html",
    needsDirectory: false,
    module: "files",
  },
  {
    id: "make_it_so",
    title: "Make It So",
    file: "f3_make_it_so.html",
    needsDirectory: true,
    dirPrompt: "Pick the `gitgud-practice` folder you made.",
    module: "files",
  },

  // --- Git & GitHub --------------------------------------------------------
  {
    id: "get_git",
    title: "Get Git",
    file: "1_get_git.html",
    needsDirectory: false,
    module: "git",
  },
  {
    id: "repository",
    title: "Repository",
    file: "2_repository.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "commit_to_it",
    title: "Commit to It",
    file: "3_commit_to_it.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "githubbin",
    title: "GitHubbin",
    file: "4_githubbin.html",
    needsDirectory: false,
    module: "git",
  },
  {
    id: "remote_control",
    title: "Remote Control",
    file: "5_remote_control.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "forks_and_clones",
    title: "Forks and Clones",
    file: "6_forks_and_clones.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "branches_arent_just_for_birds",
    title: "Branches Aren't Just for Birds",
    file: "7_branches_arent_just_for_birds.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "its_a_small_world",
    title: "It's a Small World",
    file: "8_its_a_small_world.html",
    needsDirectory: false,
    module: "git",
  },
  {
    id: "pull_never_out_of_date",
    title: "Pull, Never Out of Date",
    file: "9_pull_never_out_of_date.html",
    needsDirectory: true,
    module: "git",
  },
  {
    id: "requesting_you_pull_please",
    title: "Requesting You Pull, Please",
    file: "10_requesting_you_pull_please.html",
    needsDirectory: false,
    module: "git",
  },
  {
    id: "merge_tada",
    title: "Merge, Tada!",
    file: "11_merge_tada.html",
    needsDirectory: true,
    module: "git",
  },
];

export const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);

export const TOTAL_CHALLENGES = CHALLENGES.length;

export function challengeAt(index: number): Challenge | undefined {
  return CHALLENGES[index];
}

export function indexOf(id: string): number {
  return CHALLENGES.findIndex((c) => c.id === id);
}

export function byId(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export function moduleOf(challenge: Challenge): Module | undefined {
  return MODULES.find((m) => m.id === challenge.module);
}

/**
 * Challenges grouped for display, in `MODULES` order, carrying each entry's
 * global index so the sidebar and the body agree on its number.
 *
 * Derived rather than stored for the same reason prev/next is: two lists of
 * the same thing drift.
 */
export function grouped(): { module: Module; items: { challenge: Challenge; index: number }[] }[] {
  return MODULES.map((module) => ({
    module,
    items: CHALLENGES.map((challenge, index) => ({ challenge, index })).filter(
      ({ challenge }) => challenge.module === module.id,
    ),
  })).filter((group) => group.items.length > 0);
}

/** The companion repo every fork-based challenge points at. */
export const COMPANION = {
  owner: "JyotirmoyDas05",
  repo: "git-gud-verifywork",
  bot: "gitgud-verifybot",
  pages: "https://jyotirmoydas05.github.io/git-gud-verifywork",
} as const;

/**
 * Localized module titles and blurbs, per locale.
 *
 * The English fallback lives in `MODULES` above; a locale with no entry (or
 * a module with no entry inside it) renders the English text, exactly like
 * `strings()` does for chrome. Keeps the sidebar and the home screen in the
 * learner's language without touching challenge ids or routing.
 */
const MODULE_I18N: Record<string, Record<string, { title: string; blurb: string }>> = {
  "es-CO": {
    terminal: { title: "La terminal", blurb: "La ventana negra y cómo hablar con ella." },
    files: { title: "Archivos y carpetas", blurb: "Muévete por tu computadora y crea cosas." },
    git: { title: "Git y GitHub", blurb: "Control de versiones y cómo compartir tu trabajo." },
  },
  "es-ES": {
    terminal: { title: "El terminal", blurb: "La ventana negra y cómo hablar con ella." },
    files: { title: "Archivos y carpetas", blurb: "Muévete por tu ordenador y crea cosas." },
    git: { title: "Git y GitHub", blurb: "Control de versiones y cómo compartir tu trabajo." },
  },
  "fr-FR": {
    terminal: { title: "Le Terminal", blurb: "La fenêtre noire, et comment lui parler." },
    files: { title: "Fichiers et dossiers", blurb: "Vous orienter et créer des choses." },
    git: { title: "Git & GitHub", blurb: "Le contrôle de version, et le partage de votre travail." },
  },
  "ja-JP": {
    terminal: { title: "ターミナル", blurb: "黒い画面と、その使い方。" },
    files: { title: "ファイルとフォルダ", blurb: "移動する方法と、作り方。" },
    git: { title: "Git & GitHub", blurb: "バージョン管理と、成果の共有方法。" },
  },
  "ko-KR": {
    terminal: { title: "터미널", blurb: "검은 창과 대화하는 방법." },
    files: { title: "파일과 폴더", blurb: "둘러보는 방법과 만드는 방법." },
    git: { title: "Git & GitHub", blurb: "버전 관리와 작업 공유 방법." },
  },
  "pt-BR": {
    terminal: { title: "O Terminal", blurb: "A janela preta, e como conversar com ela." },
    files: { title: "Arquivos e Pastas", blurb: "Como se localizar e criar coisas." },
    git: { title: "Git & GitHub", blurb: "Controle de versão e como compartilhar seu trabalho." },
  },
  "uk-UA": {
    terminal: { title: "Термінал", blurb: "Чорне вікно і як з ним розмовляти." },
    files: { title: "Файли й папки", blurb: "Як орієнтуватися та створювати нове." },
    git: { title: "Git & GitHub", blurb: "Контроль версій та спільна робота." },
  },
  "zh-TW": {
    terminal: { title: "終端機", blurb: "黑色視窗,以及和它對話的方法。" },
    files: { title: "檔案與資料夾", blurb: "找到方向,並動手建立東西。" },
    git: { title: "Git & GitHub", blurb: "版本控制,以及分享你的作品。" },
  },
};

export function moduleTitle(module: Module, locale: string): string {
  return MODULE_I18N[locale]?.[module.id]?.title ?? module.title;
}

export function moduleBlurb(module: Module, locale: string): string {
  return MODULE_I18N[locale]?.[module.id]?.blurb ?? module.blurb;
}

/**
 * Localized challenge display titles, keyed by challenge id.
 * Falls back to the English `title` on the challenge itself.
 */
const CHALLENGE_I18N: Record<string, Record<string, string>> = {
  "es-CO": {
    meet_the_terminal: "Conoce la terminal",
    command_performance: "Función de comandos",
    you_are_here: "Estás aquí",
    there_and_back_again: "Ida y vuelta",
    make_it_so: "Hazlo realidad",
    get_git: "Instala Git",
    repository: "Repositorio",
    commit_to_it: "Haz commit",
    githubbin: "GitHubbin",
    remote_control: "Control remoto",
    forks_and_clones: "Forks y clones",
    branches_arent_just_for_birds: "Las ramas no son solo para los pájaros",
    its_a_small_world: "Es un mundo pequeño",
    pull_never_out_of_date: "Haz pull, nunca te quedes atrás",
    requesting_you_pull_please: "Pidiendo que hagas pull, por favor",
    merge_tada: "Haz merge, ¡tachán!",
  },
  "es-ES": {
    meet_the_terminal: "Conoce el terminal",
    command_performance: "Función de comandos",
    you_are_here: "Estás aquí",
    there_and_back_again: "Ida y vuelta",
    make_it_so: "Hazlo realidad",
    get_git: "Instala Git",
    repository: "Repositorio",
    commit_to_it: "Haz commit",
    githubbin: "GitHubbin",
    remote_control: "Control remoto",
    forks_and_clones: "Forks y clones",
    branches_arent_just_for_birds: "Las ramas no son solo para los pájaros",
    its_a_small_world: "Es un mundo pequeño",
    pull_never_out_of_date: "Haz pull, nunca te quedes atrás",
    requesting_you_pull_please: "Pidiendo que hagas pull, por favor",
    merge_tada: "Haz merge, ¡tachán!",
  },
  "fr-FR": {
    meet_the_terminal: "Rencontrez le terminal",
    command_performance: "Démonstration de commandes",
    you_are_here: "Vous êtes ici",
    there_and_back_again: "L'aller et le retour",
    make_it_so: "Exécution",
    get_git: "Obtenir Git",
    repository: "Dépôt",
    commit_to_it: "Faites votre commit",
    githubbin: "GitHubbin",
    remote_control: "Contrôle à distance",
    forks_and_clones: "Forks et clones",
    branches_arent_just_for_birds: "Les branches ne sont pas que pour les oiseaux",
    its_a_small_world: "C'est un petit monde",
    pull_never_out_of_date: "Pull, toujours à jour",
    requesting_you_pull_please: "Demande de pull, s'il vous plaît",
    merge_tada: "Merge, tada !",
  },
  "ja-JP": {
    meet_the_terminal: "ターミナルと出会う",
    command_performance: "コマンド入門",
    you_are_here: "今いる場所",
    there_and_back_again: "行って帰ってくる",
    make_it_so: "作ってみよう",
    get_git: "Gitを手に入れる",
    repository: "リポジトリ",
    commit_to_it: "コミットする",
    githubbin: "GitHubbin",
    remote_control: "リモートコントロール",
    forks_and_clones: "フォークとクローン",
    branches_arent_just_for_birds: "ブランチは鳥だけじゃない",
    its_a_small_world: "小さな世界",
    pull_never_out_of_date: "プルして最新に保つ",
    requesting_you_pull_please: "プルリクエストをお願い",
    merge_tada: "マージ、完成!",
  },
  "ko-KR": {
    meet_the_terminal: "터미널 만나기",
    command_performance: "명령어 입문",
    you_are_here: "현재 위치",
    there_and_back_again: "갔다가 돌아오기",
    make_it_so: "직접 만들어 보세요",
    get_git: "Git 설치하기",
    repository: "리포지토리",
    commit_to_it: "커밋하기",
    githubbin: "GitHubbin",
    remote_control: "리모트 컨트롤",
    forks_and_clones: "포크와 클론",
    branches_arent_just_for_birds: "브랜치는 새만의 것이 아니에요",
    its_a_small_world: "작은 세상",
    pull_never_out_of_date: "풀해서 항상 최신으로",
    requesting_you_pull_please: "풀 요청하기",
    merge_tada: "머지, 완성!",
  },
  "pt-BR": {
    meet_the_terminal: "Conheça o Terminal",
    command_performance: "Show de Comandos",
    you_are_here: "Você Está Aqui",
    there_and_back_again: "Lá e de Volta Outra Vez",
    make_it_so: "Faça Acontecer",
    get_git: "Instale o Git",
    repository: "Repositório",
    commit_to_it: "Faça um Commit",
    githubbin: "GitHubbin",
    remote_control: "Controle Remoto",
    forks_and_clones: "Forks e Clones",
    branches_arent_just_for_birds: "Branches Não São Só para Pássaros",
    its_a_small_world: "É um Mundo Pequeno",
    pull_never_out_of_date: "Pull: Nunca Desatualizado",
    requesting_you_pull_please: "Pedindo um Pull, Por Favor",
    merge_tada: "Merge, Tcharam!",
  },
  "uk-UA": {
    meet_the_terminal: "Знайомство з терміналом",
    command_performance: "Виконання команд",
    you_are_here: "Ви тут",
    there_and_back_again: "Туди й назад",
    make_it_so: "Хай буде так",
    get_git: "Отримайте Git",
    repository: "Репозиторій",
    commit_to_it: "Зробіть коміт",
    githubbin: "GitHubbin",
    remote_control: "Віддалене керування",
    forks_and_clones: "Форки та клони",
    branches_arent_just_for_birds: "Гілки — не лише для птахів",
    its_a_small_world: "Це малий світ",
    pull_never_out_of_date: "Pull — ніколи не застаріває",
    requesting_you_pull_please: "Прохання забрати зміни, будь ласка",
    merge_tada: "Merge — та-да!",
  },
  "zh-TW": {
    meet_the_terminal: "認識終端機",
    command_performance: "指令入門",
    you_are_here: "你在這裡",
    there_and_back_again: "去而復返",
    make_it_so: "動手做吧",
    get_git: "安裝 Git",
    repository: "儲存庫",
    commit_to_it: "提交吧",
    githubbin: "GitHubbin",
    remote_control: "遙控",
    forks_and_clones: "分岔與複製",
    branches_arent_just_for_birds: "分支不只是鳥的專利",
    its_a_small_world: "世界真小",
    pull_never_out_of_date: "拉取,永遠不過時",
    requesting_you_pull_please: "請你拉取",
    merge_tada: "合併,完成!",
  },
};

export function challengeTitle(challenge: Challenge, locale: string): string {
  return CHALLENGE_I18N[locale]?.[challenge.id] ?? challenge.title;
}
