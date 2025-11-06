# Specyfikacja modułu autentykacji (rejestracja, logowanie, odzyskiwanie hasła)

Status: projekt architektury (MVP, zgodny z PRD i stackiem)

Zakres: rejestracja i logowanie e‑mail+hasło, wylogowanie, odzyskiwanie konta (reset hasła z linkiem e‑mail), integracja z Supabase Auth, ochrona tras, walidacja i obsługa błędów, bez naruszania istniejących funkcji aplikacji 10x‑LinguaPairs.

Źródła: PRD (.ai/prd.md), Tech Stack (.ai/tech-stack.md)

---

## 1. Architektura interfejsu użytkownika

### 1.1. Strony i layouty (Astro)

- Layouty
  - `src/layouts/AppLayout.astro` (istniejący): bazowy layout aplikacji (nagłówek, nawigacja, slot na treść). Zmiany:
    - Warunkowe elementy UI oparte o stan uwierzytelnienia (np. „Zaloguj się” vs. menu użytkownika).
    - Docelowo: lekki wskaźnik stanu („Jesteś offline”) powiązany z PWA.
  - `src/layouts/AuthLayout.astro` (nowy): uproszczony layout dla stron auth (logo, tytuł, slot formularza, linki podręczne). Bez bocznej nawigacji, nacisk na akcję formularza.

- Strony (Astro, SSR)
  - `src/pages/auth/login.astro`
    - Zawiera `<LoginForm />` (React client) w obrębie `AuthLayout`.
    - Obsługuje query `?redirect=/sciezka` (po udanym logowaniu przekierowuje na wskazaną ścieżkę lub domyślnie do strony startowej).
  - `src/pages/auth/register.astro`
    - Zawiera `<RegisterForm />` (React client) w `AuthLayout`.
  - `src/pages/auth/forgot.astro`
    - Zawiera `<ForgotPasswordForm />` (React client) w `AuthLayout`.
  - `src/pages/auth/reset.astro` (SSR)
    - Strona docelowa z e‑maila resetującego hasło. Odbiera parametry Supabase (`code`, `type`).
    - Wykonuje na serwerze wymianę kodu na sesję (jeśli wymagana), następnie renderuje `<ResetPasswordForm />`.
  - `src/pages/auth/callback.ts` (SSR, opcjonalnie)
    - Uniwersalny handler potwierdzeń (np. sign‑up confirmation, magic link), wykonuje `exchangeCodeForSession` i przekierowuje do `/` lub `?redirect`.

Uwaga: renderowanie stron auth jest server‑side (adapter `@astrojs/node`) dla spójności sesji w SSR i poprawnego zapisu ciasteczek auth.

#### Konwencja tras: publiczne vs prywatne (zgodnie z PRD)

- Publiczne (gość):
  - Lista i przegląd kuratorowanych setów
  - Nauka/Challenge kuratorowanych setów: sugerowane trasy `'/learn/public/[setId]'`, `'/challenge/public/[setId]'`
- Prywatne (zalogowany):
  - Generacja setów i ich edycja
  - Nauka/Challenge własnych setów: `'/learn/user/[setId]'`, `'/challenge/user/[setId]'`
  - Postęp Leitner zsynchronizowany: `'/progress'`/widoki konta

Zalecenie: wprowadzić segment `[source] ∈ {public, user}` w trasach `learn` i `challenge`, aby middleware mógł precyzyjnie egzekwować dostęp bez blokowania trybu gościa.

### 1.2. Komponenty (React, client‑side)

Lokalizacja: `src/components/auth/`

- `LoginForm.tsx`
  - Pola: e‑mail, hasło.
  - Akcje: „Zaloguj”, linki do „Zarejestruj się”, „Nie pamiętasz hasła?”.
  - Walidacja z Zod (onChange/onBlur), komunikaty inline.
  - Integracja: wywołuje `AuthService.signInWithPassword`, obsługuje `redirect`.
- `RegisterForm.tsx`
  - Pola: e‑mail, hasło, powtórzenie hasła, zgody (jeśli wymagane).
  - Walidacja: siła hasła, zgodność haseł.
  - Integracja: `AuthService.signUpWithPassword`. Po sukcesie komunikat o e‑mailu weryfikacyjnym.
- `ForgotPasswordForm.tsx`
  - Pole: e‑mail.
  - Integracja: `AuthService.requestPasswordReset` (wysyła e‑mail z linkiem do `/auth/reset`).
- `ResetPasswordForm.tsx`
  - Pola: nowe hasło, powtórzenie hasła.
  - Integracja: `AuthService.completePasswordReset` (po SSR exchange code). Po sukcesie: auto‑logowanie lub link „Zaloguj się”.
- `LogoutButton.tsx`
  - Integracja: `AuthService.signOut` (server‑side preferowane) + odświeżenie UI.
- `AuthGate.tsx` (opcjonalnie)
  - Renderuje dzieci tylko dla zalogowanych; w trybie client działa jako łagodna osłona (SSR i tak egzekwuje dostęp).

Komponenty UI (Shadcn/ui): wykorzystujemy istniejący `Button`; wymagane doinstalowanie `Input`, `Label`, `Form` (+ komunikaty błędów). Styl „new‑york”, kolor „neutral” (zgodnie z tech‑stack).

### 1.3. Rozdzielenie odpowiedzialności Astro vs React

- Strony Astro
  - SSR, pobranie `context.locals.supabase`, wstępne decyzje (np. jeśli użytkownik zalogowany na `/auth/login`, to redirect do `/`).
  - Osadzanie komponentów React (formularzy) i przekazywanie parametrów (np. `redirect`).

- Komponenty React (formularze)
  - Tylko interakcja/form state, walidacje, wywołania do `AuthService` (który kapsułkuje Supabase client JS po stronie przeglądarki).
  - Prezentacja błędów/stanów (loading, success, inline errors, toast).

### 1.4. Walidacja i komunikaty błędów

- Walidacja (Zod, `src/lib/validation/auth.schemas.ts`)
  - `email`: poprawny format.
  - `password`: min. 8 znaków, min. 1 litera, 1 cyfra (możliwe rozszerzenie o znak specjalny).
  - `passwordConfirm`: zgodność z `password` tam gdzie dotyczy.
  - Teksty błędów w PL, krótkie i konkretne.

- Mapowanie błędów Supabase → UI (`src/lib/errors/auth.errors.ts`)
  - Duplikat e‑mail: „Konto z tym adresem już istnieje”.
  - Nieprawidłowe dane logowania: „Błędny e‑mail lub hasło”.
  - Token wygasł/zużyty: „Link wygasł. Poproś o nowy link.”
  - Inne (fallback): „Wystąpił błąd. Spróbuj ponownie.”

- Prezentacja
  - Inline przy polach + ogólny alert nad formularzem przy błędach globalnych.
  - Przy sukcesie działań mailowych: „Sprawdź skrzynkę pocztową. Wysłaliśmy link do…”.

### 1.5. Kluczowe scenariusze UI

- Rejestracja
  1) Użytkownik wypełnia formularz → walidacja Zod → `signUp` → komunikat o weryfikacji e‑mail.
  2) Po kliknięciu w link aktywacyjny (Supabase) → `exchangeCodeForSession` (SSR) → redirect na `/` lub wskazany `redirect`.

- Logowanie
  1) Formularz → `signInWithPassword` → redirect do `redirect` lub domyślnej strony.
  2) Niepowodzenie → komunikat błędu + reset pola hasła (bez resetu e‑maila).

- Zapomniane hasło
  1) Formularz e‑mail → `resetPasswordForEmail` (redirect: `/auth/reset`).
  2) Użytkownik z e‑maila trafia na `/auth/reset?code=...` → SSR exchange code → formularz ustawienia nowego hasła → `updateUser({ password })` → sukces.

- Wylogowanie
  - `signOut` (server preferowany dla spójności cookie) → redirect do strony publicznej.

- Ochrona tras (np. generacja setów)
  - SSR middleware przekierowuje niezalogowanych na `/auth/login?redirect=/docelowa`.

- Nauka/Challenge kuratorowanych setów (gość)
  - Dostępne bez logowania na trasach `'/learn/public/*'` i `'/challenge/public/*'`.
  - Postęp zapisywany lokalnie (localStorage/IndexedDB) do 10 ostatnich setów (zgodnie z PWA w PRD).

---

## 2. Logika backendowa

### 2.1. Supabase client i middleware

- `src/db/supabase.client.ts`
  - Eksportuje skonfigurowane fabryki klienta dla SSR (`createServerClient`) i przeglądarki (`createBrowserClient`).
  - Importować w kodzie projektowym wyłącznie z tego pliku (zgodnie z wytycznymi repo).

- `src/middleware/index.ts`
  - Wstrzykuje klienta Supabase do `context.locals.supabase` dla tras SSR.
  - Implementuje ochronę tras (lista wzorców PROTECTED_ROUTES):
    - `'/generate'`, `'/sets/user/*'`, `'/learn/user/*'`, `'/challenge/user/*'`, `'/progress'`
    - wykluczenia (jawnie publiczne): `'/sets/public/*'`, `'/learn/public/*'`, `'/challenge/public/*'`
    - przekierowanie niezalogowanych do `'/auth/login?redirect=...'` (walidacja, że `redirect` jest ścieżką względną).

### 2.2. Endpointy API (Astro pages API)

Lokalizacja: `src/pages/api/auth/`

- `session.ts` (GET)
  - Zwraca: `{ user: { id, email }, session: { expiresAt } }` lub `{ user: null }`.
  - Źródło prawdy: `context.locals.supabase.auth.getUser()`/`getSession()`.

- `signout.ts` (POST)
  - Serwerowe wylogowanie: `context.locals.supabase.auth.signOut()` → 204.

Uwaga: rejestracja/logowanie/reset realizowane głównie z poziomu klienta (Supabase JS). SSR strony `reset`/`callback` wykonują operacje `exchangeCodeForSession` i przekierowania bez ekspozycji dodatkowych endpointów.

### 2.3. Walidacja danych wejściowych

- Zod schematy: `src/lib/validation/auth.schemas.ts`
  - `LoginFormData`, `RegisterFormData`, `ForgotPasswordFormData`, `ResetPasswordFormData`.
  - Wykorzystywane w komponentach React oraz ewentualnie po stronie API (gdy endpoint przyjmuje body).

### 2.4. Obsługa wyjątków

- Błędy Supabase mapowane przez `mapSupabaseAuthError(error)` do przyjaznych komunikatów.
- API zwraca kody: 200/204 (ok), 400 (walidacja), 401 (brak sesji), 429 (limit – jeśli dotyczy), 500 (nieoczekiwany).
- SSR: przy krytycznych błędach linków (expired/used) → renderowana strona z komunikatem i linkiem do ponownego rozpoczęcia procesu (np. „Wyślij ponownie link resetu”).

### 2.5. SSR a adapter Node (`@astrojs/node`)

- Strony auth (`/auth/*`) renderowane SSR zapewniają ustawienie/odczyt cookie przez Supabase w kontekście serwera.
- Ochrona tras realizowana w middleware SSR (przed renderem strony docelowej).
- Prerender wyłączony dla stron zależnych od sesji.

---

## 3. System autentykacji (Supabase Auth + Astro)

### 3.1. Przepływy (happy path + edge cases)

- Rejestracja (e‑mail + hasło)
  - `supabase.auth.signUp({ email, password })` (client) → e‑mail weryfikacyjny → `auth/callback` (SSR) `exchangeCodeForSession` → redirect do aplikacji.
  - Edge: e‑mail zajęty → komunikat; konto niezweryfikowane → logowanie może wymagać potwierdzenia e‑mail.

- Logowanie (e‑mail + hasło)
  - `supabase.auth.signInWithPassword({ email, password })` (client) → sesja + cookies (SSO z SSR jeśli stosujemy `@supabase/ssr`).
  - Edge: błędne dane, konto nieaktywne.

- Reset hasła
  - `supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL + '/auth/reset' })`.
  - Na `/auth/reset`: SSR `exchangeCodeForSession()` (jeśli `type=recovery`) → `supabase.auth.updateUser({ password })` (client lub server) → sukces.

- Wylogowanie
  - `supabase.auth.signOut()` na serwerze (API POST `/api/auth/signout`) lub bezpośrednio w SSR, aby oczyścić cookie.

### 3.2. Klienci Supabase i przechowywanie sesji

- Przeglądarka: `createBrowserClient` z pamięcią sesji opartą o cookies lub localStorage (rekomendowane: zgodność z SSR, `@supabase/ssr` cookie‑based).
- Serwer (Astro SSR): `createServerClient` operujący na `Astro.cookies` (zapisy/odczyty zgodnie z polityką `SameSite=Lax`, `Secure` w prod).

### 3.3. Ochrona zasobów i limity z PRD

- Gość: tylko kuratorowane zestawy (trasy publiczne). Middleware przepuszcza publiczne ścieżki.
- Zalogowany: generacja zestawów (limit 3/dzień – egzekwowane w endpointach domenowych generacji; poza zakresem tej specy, ale auth dostarcza identyfikator użytkownika przez `locals.supabase`).
- Offline: auth wymaga on‑line do logowania/rejestracji/resetu; bieżąca sesja może pozostać ważna i pozwalać na naukę offline (PWA cache zestawów).

Mapowanie na user stories (PRD):

- Chronione (wymagają logowania): US‑001, US‑002, US‑003, US‑004, US‑005, US‑006, US‑012; US‑011 dla synchronizacji postępu do chmury.
- Publiczne: US‑015, US‑008, US‑009, US‑013; US‑007 może pozostać publiczne (zalecany rate‑limit) lub wymagać logowania – decyzja produktowa.
- Częściowe: US‑010 (Challenge) – publiczne dla kuratorowanych setów; logowanie wymagane do zapisu postępu w chmurze.

### 3.4. Bezpieczeństwo i zgodność

- Nie przechowujemy haseł; wszystkie operacje przez Supabase Auth.
- Cookies ustawiane przez klienta SSR Supabase; `HttpOnly`, `Secure` (prod), `SameSite=Lax`.
- Brak własnych tokenów JWT – źródło prawdy: Supabase.
- RLS w bazie pozostaje włączony; identyfikacja użytkownika przez JWT Supabase przy zapytaniach do DB (poza niniejszą specyfikacją implementacyjną DB).
- CSRF: formularze auth wołają API Supabase bezpośrednio; tam gdzie używamy własnego endpointu POST (`/api/auth/signout`) wymagamy `SameSite=Lax` (domyślnie minimalizuje ryzyko); w razie rozszerzenia POST‑ów przyjmiemy token anty‑CSRF.

---

## 4. Kontrakty, moduły i struktura plików

### 4.1. Struktura

- `src/pages/auth/login.astro`
- `src/pages/auth/register.astro`
- `src/pages/auth/forgot.astro`
- `src/pages/auth/reset.astro`
- `src/pages/auth/callback.ts` (opcjonalnie)
- `src/layouts/AuthLayout.astro`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/auth/LogoutButton.tsx`
- `src/components/auth/AuthGate.tsx` (opcjonalnie)
- `src/pages/api/auth/session.ts`
- `src/pages/api/auth/signout.ts`
- `src/lib/services/auth.service.ts`
- `src/lib/validation/auth.schemas.ts`
- `src/lib/errors/auth.errors.ts`
- `src/db/supabase.client.ts`
- `src/middleware/index.ts` (rozszerzenie o ochronę tras)

Sugerowane trasy nauki/wyzwań z rozróżnieniem źródła:

- `src/pages/learn/[source]/[setId].astro` gdzie `[source] ∈ {public, user}`
- `src/pages/challenge/[source]/[setId].astro`

### 4.2. DTO i typy (`src/types.ts`)

Bez implementacji, ale docelowo:

```ts
// Typy przykładowe – nazwy i kształty pod wspólne użycie front/back
export type AuthUser = { id: string; email: string };
export type AuthSession = { expiresAt: string | null };
export type AuthStatusResponse = { user: AuthUser | null; session?: AuthSession | null };

export type AuthErrorCode =
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'UNKNOWN';

export type AuthError = { code: AuthErrorCode; message: string };
```

### 4.3. Serwis autentykacji (`src/lib/services/auth.service.ts`)

Interfejs (docelowo):

```ts
export interface AuthServiceApi {
  signInWithPassword(input: { email: string; password: string }): Promise<{ user: AuthUser }>; 
  signUpWithPassword(input: { email: string; password: string }): Promise<void>; // email confirm step
  requestPasswordReset(input: { email: string }): Promise<void>;
  completePasswordReset(input: { newPassword: string }): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthStatusResponse>;
}
```

Uwagi implementacyjne:

- Wersja przeglądarkowa korzysta z `createBrowserClient` i metod `supabase.auth.*`.
- Dla `completePasswordReset` zakładamy, że SSR `/auth/reset` już wykonał `exchangeCodeForSession`.

### 4.4. Walidacje (`src/lib/validation/auth.schemas.ts`)

Schematy Zod (zwięźle):

- `loginSchema`: `{ email: z.string().email(), password: z.string().min(8) }`
- `registerSchema`: `loginSchema` + `passwordConfirm` (refine na zgodność) + reguły siły hasła
- `forgotSchema`: `{ email: z.string().email() }`
- `resetSchema`: `{ password: z.string().min(8), passwordConfirm: z.string() }` + refine

### 4.5. Mapowanie błędów (`src/lib/errors/auth.errors.ts`)

Funkcja: `mapSupabaseAuthError(e): AuthError` – tłumaczy kody Supabase/HTTP na kategorie i czytelne komunikaty PL.

---

## 5. Ochrona tras i nawigacja

### 5.1. Middleware wzorce tras

- Publiczne: strona startowa, kuratorowane zestawy (gość), strony auth.
- Chronione (przykłady, zgodnie z PRD): generacja zestawów, nauka (tam gdzie wymagany zapis postępu), Challenge, widok Leitner (zapis sesji i postępów).

Strategia:

- Jeśli `locals.supabase.auth.getUser()` zwróci brak użytkownika na trasie z listy PROTECTED → 302 do `/auth/login?redirect=<bieżąca>`.
- Jeśli użytkownik jest zalogowany i wejdzie na `/auth/login` lub `/auth/register` → 302 do `/` lub parametru `redirect` (jeśli istnieje i jest bezpieczny, ta sama domena).

Persistencja postępu (Leitner):

- Gość → zapis lokalny (IndexedDB/localStorage) z kluczem per `setId`; retencja do 10 setów (PWA cache z PRD).
- Zalogowany → zapis w Supabase (identyfikacja przez JWT); możliwość późniejszej migracji lokalnych danych po zalogowaniu (opcjonalne po MVP).

### 5.2. SSR vs client

- SSR decyduje o dostępie (źródło prawdy), client jedynie poprawia UX (spinnery, AuthGate dla elementów dynamicznych).

---

## 6. Zgodność z PRD i stackiem

- PRD: „Bezpieczne logowanie” (US‑014) – e‑mail+hasło, stan zalogowania wymagany do generacji i zapisu postępu → zapewnione przez ochronę tras i integrację z Supabase.
- PRD: „Dostęp gościa” (US‑015) – bez rejestracji do kuratorowanych zestawów → ścieżki publiczne pozostają dostępne; UI nie wymusza logowania dla trybu gościa.
- PRD: Limity generacji (US‑012) – nie są częścią samej autentykacji, ale auth dostarcza identyfikatora użytkownika do ich egzekwowania w endpointach domenowych.
- Stack: Astro 5 + Node adapter SSR → strony auth i middleware działają server‑side; React 19 dla formularzy; Tailwind/Shadcn dla UI; Zod dla walidacji; Supabase 2.x przez `src/db/supabase.client.ts`.
- Aliasy importów: `@/...` (z `tsconfig.json`).

Uwaga dot. granic MVP (PRD §4): reset hasła wskazany jako poza MVP. Ta specyfikacja zawiera plan architektury resetu, ale wdrożenie można włączyć za pomocą feature‑flaga (np. `AUTH_RESET_ENABLED=true`) i pominąć w MVP.

---

## 7. Telemetria i UX (opcjonalne w MVP)

- Logi zdarzeń (np. `auth_sign_in_success`, `auth_sign_in_error`, `auth_password_reset_request`) – do późniejszego podłączenia w `src/lib/services/telemetry.service.ts`.
- Obsługa offline: komunikaty na stronach auth wskazujące konieczność połączenia z internetem.

---

## 8. Checklist wdrożeniowy (bez implementacji)

1) Doinstalować brakujące komponenty Shadcn (Input/Label/Form) i spiąć style.
2) Utworzyć layout `AuthLayout.astro` i strony `/auth/*` jak w strukturze.
3) Dodać formularze React i walidacje Zod.
4) Zaimplementować `src/db/supabase.client.ts` (SSR i browser) oraz rozszerzyć `src/middleware/index.ts` o ochronę tras.
5) Utworzyć API `GET /api/auth/session`, `POST /api/auth/signout`.
6) Zaimplementować `AuthService` (browser) i mapowanie błędów.
7) Przejścia i przekierowania (obsługa `redirect`), edge‑cases linków (expired/used).
8) Testy ręczne happy‑path i edge‑cases; lint i format.
9) Rozdzielić trasy `learn`/`challenge` na publiczne i prywatne (`[source]`).
10) Opcjonalnie włączyć reset hasła flagą środowiskową `AUTH_RESET_ENABLED` (poza MVP).

---

## 9. Uwagi bezpieczeństwa

- W produkcji wymusić `Secure` dla ciasteczek i HTTPS.
- Weryfikować parametr `redirect` (dozwolone tylko ścieżki względne w obrębie domeny).
- Nie logować danych wrażliwych (hasła, tokeny); komunikaty błędów bez ujawniania szczegółów technicznych.


