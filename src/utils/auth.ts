import { 
  User, USERS_STORAGE_KEY, WorkerOnboardingData, EmployerPreferences,
  WORKER_ONBOARDING_KEY, EMPLOYER_PREFS_KEY, AuthLanguage
} from '../types';

// --- Language Dictionary ---
export const TEXTS = {
  en: {
    landingTitle: "Smart Marketplace for Jobs",
    landingDesc: "A smart marketplace where employers post jobs and workers send offers.",
    hireBtn: "I want to HIRE",
    workBtn: "I want to WORK",
    loginLink: "Already have an account? Log in",
    createLink: "Create an account",
    welcomeBack: "Welcome back",
    continueAs: "Continue as",
    switchAccount: "Switch account",
    loginTitle: "Login",
    registerTitle: "Create Account",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm Password",
    rememberMe: "Remember me on this device",
    demoEmployer: "Login as Demo Employer",
    demoWorker: "Login as Demo Worker",
    roleEmployer: "Employer",
    roleWorker: "Worker",
    employerDesc: "Post jobs, receive offers, and choose the best worker.",
    workerDesc: "Find jobs, send offers, and build your reputation.",
    registerBtn: "Register",
    loginBtn: "Login",
    back: "Back",
    onboardingTitle: "Welcome! Let's get set up.",
    onboardingSub: "Tell us a bit more to get started.",
    saveContinue: "Save & Continue",
    skip: "Skip for now"
  },
  az: {
    landingTitle: "Ağıllı İş Bazarı",
    landingDesc: "İşəgötürənlərin elan yerləşdirdiyi və işçilərin təklif göndərdiyi platforma.",
    hireBtn: "İşçi Axtarıram",
    workBtn: "İş Axtarıram",
    loginLink: "Hesabınız var? Giriş",
    createLink: "Hesab yarat",
    welcomeBack: "Xoş gəlmisiniz",
    continueAs: "Davam et:",
    switchAccount: "Hesabı dəyiş",
    loginTitle: "Giriş",
    registerTitle: "Qeydiyyat",
    username: "İstifadəçi adı",
    password: "Şifrə",
    confirmPassword: "Şifrəni təsdiqlə",
    rememberMe: "Məni xatırlas",
    demoEmployer: "Demo İşəgötürən",
    demoWorker: "Demo İşçi",
    roleEmployer: "İşəgötürən",
    roleWorker: "İşçi",
    employerDesc: "İş elan et, təkliflər al və ən yaxşı işçini seç.",
    workerDesc: "İş tap, təklif göndər və reytinq qazan.",
    registerBtn: "Qeydiyyat",
    loginBtn: "Daxil ol",
    back: "Geri",
    onboardingTitle: "Xoş gəlmisiniz!",
    onboardingSub: "Başlamaq üçün məlumatları doldurun.",
    saveContinue: "Yadda saxla və Davam et",
    skip: "Hələlik keç"
  },
  ru: {
    landingTitle: "Умный Рынок Услуг",
    landingDesc: "Платформа, где работодатели размещают задачи, а исполнители предлагают услуги.",
    hireBtn: "Я Нанимаю",
    workBtn: "Я Работаю",
    loginLink: "Уже есть аккаунт? Войти",
    createLink: "Создать аккаунт",
    welcomeBack: "С возвращением",
    continueAs: "Продолжить как",
    switchAccount: "Сменить аккаунт",
    loginTitle: "Вход",
    registerTitle: "Регистрация",
    username: "Имя пользователя",
    password: "Пароль",
    confirmPassword: "Подтвердите пароль",
    rememberMe: "Запомнить меня",
    demoEmployer: "Демо Работодатель",
    demoWorker: "Демо Исполнитель",
    roleEmployer: "Работодатель",
    roleWorker: "Исполнитель",
    employerDesc: "Размещайте задачи, получайте отклики и выбирайте лучших.",
    workerDesc: "Находите заказы, отправляйте отклики и стройте репутацию.",
    registerBtn: "Регистрация",
    loginBtn: "Войти",
    back: "Назад",
    onboardingTitle: "Добро пожаловать!",
    onboardingSub: "Заполните профиль, чтобы начать.",
    saveContinue: "Сохранить и Продолжить",
    skip: "Пропустить"
  }
};

// --- Demo Users ---
export const ensureDemoUsers = () => {
  const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
  let users: User[] = usersStr ? JSON.parse(usersStr) : [];
  let changed = false;

  if (!users.some(u => u.username === 'demoEmployer')) {
    users.push({ username: 'demoEmployer', password: '123', role: 'employer', isActive: true, hasCompletedOnboarding: true });
    changed = true;
  }
  if (!users.some(u => u.username === 'demoWorker')) {
    users.push({ username: 'demoWorker', password: '123', role: 'worker', isActive: true, hasCompletedOnboarding: true });
    changed = true;
  }

  if (changed) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }
};

// --- Onboarding Helpers ---

export const setUserOnboardingComplete = (username: string) => {
  const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
  if (!usersStr) return;
  const users: User[] = JSON.parse(usersStr);
  const updatedUsers = users.map(u => 
    u.username === username ? { ...u, hasCompletedOnboarding: true } : u
  );
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
};

export const hasCompletedOnboarding = (username: string, role: 'worker' | 'employer'): boolean => {
  // 1. Check User Object Flag
  const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];
  const user = users.find(u => u.username === username);
  
  if (user && user.hasCompletedOnboarding === true) {
    return true;
  }

  // 2. Fallback: Check Legacy Storage (Self-healing)
  let legacyCompleted = false;
  if (role === 'worker') {
    const dataStr = localStorage.getItem(WORKER_ONBOARDING_KEY);
    if (dataStr) {
      const data: WorkerOnboardingData[] = JSON.parse(dataStr);
      legacyCompleted = data.some(d => d.username === username);
    }
  } else {
    const dataStr = localStorage.getItem(EMPLOYER_PREFS_KEY);
    if (dataStr) {
      const data: EmployerPreferences[] = JSON.parse(dataStr);
      legacyCompleted = data.some(d => d.username === username);
    }
  }

  // If legacy check passed, update the user object so next time it's faster
  if (legacyCompleted && user) {
    setUserOnboardingComplete(username);
    return true;
  }

  return false;
};

export const saveWorkerOnboarding = (data: WorkerOnboardingData) => {
  const str = localStorage.getItem(WORKER_ONBOARDING_KEY);
  const all: WorkerOnboardingData[] = str ? JSON.parse(str) : [];
  const filtered = all.filter(d => d.username !== data.username);
  filtered.push(data);
  localStorage.setItem(WORKER_ONBOARDING_KEY, JSON.stringify(filtered));
  
  // Update User Flag
  setUserOnboardingComplete(data.username);
};

export const saveEmployerPreferences = (data: EmployerPreferences) => {
  const str = localStorage.getItem(EMPLOYER_PREFS_KEY);
  const all: EmployerPreferences[] = str ? JSON.parse(str) : [];
  const filtered = all.filter(d => d.username !== data.username);
  filtered.push(data);
  localStorage.setItem(EMPLOYER_PREFS_KEY, JSON.stringify(filtered));

  // Update User Flag
  setUserOnboardingComplete(data.username);
};
