# Diagram architektury UI - Moduł autentykacji i rejestracji

<architecture_analysis>

## Analiza architektury

### Komponenty wymienione w dokumentacji:

#### Layouty (Astro):

1. **AppLayout.astro** (istniejący) - bazowy layout aplikacji z nagłówkiem i nawigacją
2. **AuthLayout.astro** (nowy) - uproszczony layout dla stron auth bez bocznej nawigacji

#### Strony (Astro SSR):

1. **index.astro** - strona startowa (publiczna)
2. **generate.astro** - strona generacji zestawów (chroniona)
3. **auth/login.astro** - strona logowania
4. **auth/register.astro** - strona rejestracji
5. **auth/forgot.astro** - strona odzyskiwania hasła
6. **auth/reset.astro** - strona resetu hasła (SSR)
7. **auth/callback.ts** - handler potwierdzeń (opcjonalnie)
8. **learn/[source]/[setId].astro** - strona nauki (publiczna/user)
9. **challenge/[source]/[setId].astro** - strona challenge (publiczna/user)
10. **progress.astro** - widok postępów (chroniona)

#### Komponenty React (client-side):

1. **LoginForm.tsx** - formularz logowania
2. **RegisterForm.tsx** - formularz rejestracji
3. **ForgotPasswordForm.tsx** - formularz resetu hasła
4. **ResetPasswordForm.tsx** - formularz ustawienia nowego hasła
5. **LogoutButton.tsx** - przycisk wylogowania
6. **AuthGate.tsx** - komponent ochrony (opcjonalnie)
7. **GenerateWizard.tsx** - kreator generowania (istniejący, wymaga aktualizacji)

#### Komponenty UI (Shadcn/ui):

1. **Button** - przycisk (istniejący)
2. **Input** - pole tekstowe (istniejący)
3. **Label** - etykieta (istniejący)
4. **Alert** - komunikat (istniejący)
5. **Form** - formularz (wymagany doinstalowanie)

#### Backend - API endpoints:

1. **GET /api/auth/session** - sprawdzenie sesji
2. **POST /api/auth/signout** - wylogowanie

#### Serwisy:

1. **auth.service.ts** - serwis autentykacji (nowy)

#### Walidacja:

1. **auth.schemas.ts** - schematy Zod (nowy)

#### Obsługa błędów:

1. **auth.errors.ts** - mapowanie błędów Supabase (nowy)

#### Infrastruktura:

1. **supabase.client.ts** - klient Supabase (istniejący, wymaga aktualizacji)
2. **middleware/index.ts** - middleware Astro (istniejący, wymaga rozszerzenia)

### Główne strony i odpowiadające komponenty:

- **Strona startowa** (`/`) → `Welcome.astro` → `AppLayout`
- **Logowanie** (`/auth/login`) → `LoginForm` → `AuthLayout`
- **Rejestracja** (`/auth/register`) → `RegisterForm` → `AuthLayout`
- **Reset hasła** (`/auth/reset`) → `ResetPasswordForm` → `AuthLayout`
- **Generacja** (`/generate`) → `GenerateWizard` → `AppLayout` (chroniona)
- **Nauka** (`/learn/[source]/[setId]`) → komponenty nauki → `AppLayout`
- **Challenge** (`/challenge/[source]/[setId]`) → komponenty challenge → `AppLayout`
- **Postęp** (`/progress`) → widok postępów → `AppLayout` (chroniona)

### Przepływ danych:

1. **Rejestracja**: `RegisterForm` → `AuthService.signUpWithPassword` → Supabase Auth → e-mail weryfikacyjny → `callback.ts` → `exchangeCodeForSession` → redirect
2. **Logowanie**: `LoginForm` → `AuthService.signInWithPassword` → Supabase Auth → sesja → cookies → redirect
3. **Reset hasła**: `ForgotPasswordForm` → `AuthService.requestPasswordReset` → e-mail → `reset.astro` (SSR) → `exchangeCodeForSession` → `ResetPasswordForm` → `AuthService.completePasswordReset`
4. **Ochrona tras**: Middleware sprawdza `locals.supabase.auth.getUser()` → jeśli brak użytkownika na chronionej trasie → redirect do `/auth/login?redirect=...`
5. **Wylogowanie**: `LogoutButton` → `AuthService.signOut` → `/api/auth/signout` → `signOut()` → redirect

### Funkcjonalność komponentów:

- **AppLayout**: Bazowy layout z nagłówkiem, nawigacją warunkową (zalogowany vs gość), slot na treść
- **AuthLayout**: Uproszczony layout dla formularzy auth (logo, tytuł, slot formularza)
- **LoginForm**: Formularz z walidacją Zod, obsługa błędów, redirect po sukcesie
- **RegisterForm**: Formularz z walidacją siły hasła, powiadomienie o e-mailu weryfikacyjnym
- **ForgotPasswordForm**: Formularz do wysłania linku resetu
- **ResetPasswordForm**: Formularz ustawienia nowego hasła po weryfikacji kodu
- **LogoutButton**: Przycisk wylogowania z odświeżeniem UI
- **AuthGate**: Komponent warunkowego renderowania dla zalogowanych
- **Middleware**: Wstrzykuje Supabase client, sprawdza autentykację, chroni trasy
- **AuthService**: Kapsułkuje operacje Supabase Auth (signIn, signUp, signOut, reset)
- **auth.schemas.ts**: Schematy Zod dla walidacji formularzy
- **auth.errors.ts**: Mapowanie błędów Supabase na przyjazne komunikaty PL

</architecture_analysis>

<mermaid_diagram>

```mermaid
flowchart TD
    Start([Użytkownik]) --> Middleware{Middleware<br/>index.ts}

    subgraph Infrastruktura["Infrastruktura"]
        SupabaseClient[supabase.client.ts<br/>SSR i Browser Client]
        Middleware
    end

    Middleware --> CheckAuth{Sprawdzenie<br/>autentykacji}

    CheckAuth -->|Zalogowany| ProtectedRoute{Trasa<br/>chroniona?}
    CheckAuth -->|Gość| PublicRoute{Trasa<br/>publiczna?}

    ProtectedRoute -->|Tak| RedirectAuth[Redirect do<br/>/auth/login]
    ProtectedRoute -->|Nie| AppLayout[AppLayout.astro<br/>Bazowy layout]

    PublicRoute -->|Tak| AppLayout
    PublicRoute -->|Nie| RedirectAuth

    subgraph StronyPubliczne["Strony Publiczne"]
        IndexPage[index.astro<br/>Strona startowa]
        LearnPublic[learn/public/[setId].astro<br/>Nauka kuratorowanych]
        ChallengePublic[challenge/public/[setId].astro<br/>Challenge kuratorowanych]
    end

    subgraph StronyAuth["Strony Autentykacji"]
        LoginPage[login.astro<br/>Strona logowania]
        RegisterPage[register.astro<br/>Strona rejestracji]
        ForgotPage[forgot.astro<br/>Odzyskiwanie hasła]
        ResetPage[reset.astro<br/>Reset hasła SSR]
        CallbackPage[callback.ts<br/>Handler potwierdzeń]
    end

    subgraph StronyChronione["Strony Chronione"]
        GeneratePage[generate.astro<br/>Generacja zestawów]
        LearnUser[learn/user/[setId].astro<br/>Nauka własnych]
        ChallengeUser[challenge/user/[setId].astro<br/>Challenge własnych]
        ProgressPage[progress.astro<br/>Widok postępów]
    end

    subgraph LayoutAuth["Layout Autentykacji"]
        AuthLayout[AuthLayout.astro<br/>Uproszczony layout]
    end

    RedirectAuth --> AuthLayout
    AuthLayout --> LoginPage
    AuthLayout --> RegisterPage
    AuthLayout --> ForgotPage

    ResetPage --> AuthLayout
    CallbackPage --> AppLayout

    AppLayout --> IndexPage
    AppLayout --> LearnPublic
    AppLayout --> ChallengePublic
    AppLayout --> GeneratePage
    AppLayout --> LearnUser
    AppLayout --> ChallengeUser
    AppLayout --> ProgressPage

    subgraph FormularzeAuth["Komponenty React - Formularze Auth"]
        LoginForm[LoginForm.tsx<br/>Formularz logowania]
        RegisterForm[RegisterForm.tsx<br/>Formularz rejestracji]
        ForgotForm[ForgotPasswordForm.tsx<br/>Formularz resetu]
        ResetForm[ResetPasswordForm.tsx<br/>Formularz nowego hasła]
        LogoutBtn[LogoutButton.tsx<br/>Przycisk wylogowania]
        AuthGate[AuthGate.tsx<br/>Komponent ochrony]
    end

    LoginPage --> LoginForm
    RegisterPage --> RegisterForm
    ForgotPage --> ForgotForm
    ResetPage --> ResetForm
    AppLayout --> LogoutBtn
    AppLayout --> AuthGate

    subgraph KomponentyUI["Komponenty UI Shadcn"]
        UIButton[Button.tsx]
        UIInput[Input.tsx]
        UILabel[Label.tsx]
        UIAlert[Alert.tsx]
        UIForm[Form.tsx<br/>wymagany]
    end

    LoginForm --> UIButton
    LoginForm --> UIInput
    LoginForm --> UILabel
    LoginForm --> UIAlert
    LoginForm --> UIForm

    RegisterForm --> UIButton
    RegisterForm --> UIInput
    RegisterForm --> UILabel
    RegisterForm --> UIAlert
    RegisterForm --> UIForm

    ForgotForm --> UIButton
    ForgotForm --> UIInput
    ForgotForm --> UIAlert

    ResetForm --> UIButton
    ResetForm --> UIInput
    ResetForm --> UILabel
    ResetForm --> UIAlert
    ResetForm --> UIForm

    subgraph Serwisy["Serwisy"]
        AuthService[auth.service.ts<br/>Operacje autentykacji]
    end

    LoginForm -->|wywołuje| AuthService
    RegisterForm -->|wywołuje| AuthService
    ForgotForm -->|wywołuje| AuthService
    ResetForm -->|wywołuje| AuthService
    LogoutBtn -->|wywołuje| AuthService

    subgraph Walidacja["Walidacja"]
        AuthSchemas[auth.schemas.ts<br/>Schematy Zod]
    end

    LoginForm -->|używa| AuthSchemas
    RegisterForm -->|używa| AuthSchemas
    ForgotForm -->|używa| AuthSchemas
    ResetForm -->|używa| AuthSchemas

    subgraph ObslugaBledow["Obsługa Błędów"]
        AuthErrors[auth.errors.ts<br/>Mapowanie błędów]
    end

    AuthService -->|używa| AuthErrors
    LoginForm -->|wyświetla| AuthErrors
    RegisterForm -->|wyświetla| AuthErrors
    ForgotForm -->|wyświetla| AuthErrors
    ResetForm -->|wyświetla| AuthErrors

    subgraph APIEndpoints["API Endpoints"]
        SessionAPI[session.ts<br/>GET /api/auth/session]
        SignoutAPI[signout.ts<br/>POST /api/auth/signout]
    end

    AuthService -->|wywołuje| SessionAPI
    LogoutBtn -->|wywołuje| SignoutAPI
    Middleware -->|odczytuje| SessionAPI

    AuthService -->|używa| SupabaseClient
    SessionAPI -->|używa| SupabaseClient
    SignoutAPI -->|używa| SupabaseClient
    ResetPage -->|używa| SupabaseClient
    CallbackPage -->|używa| SupabaseClient

    subgraph KomponentyIstniejace["Komponenty Istniejące - Wymagają Aktualizacji"]
        GenerateWizard[GenerateWizard.tsx<br/>Kreator generowania]
    end

    GeneratePage --> GenerateWizard
    GenerateWizard -.->|wymaga| AuthService

    subgraph SupabaseAuth["Supabase Auth"]
        SupabaseAuthService[Supabase Auth<br/>Rejestracja Logowanie<br/>Reset Sesja]
    end

    AuthService -->|komunikuje| SupabaseAuthService
    SessionAPI -->|komunikuje| SupabaseAuthService
    SignoutAPI -->|komunikuje| SupabaseAuthService
    ResetPage -->|komunikuje| SupabaseAuthService
    CallbackPage -->|komunikuje| SupabaseAuthService

    SupabaseAuthService -->|zwraca| AuthService
    SupabaseAuthService -->|ustawia cookies| Middleware

    style AuthLayout fill:#e1f5ff,stroke:#0277bd,stroke-width:2px
    style LoginForm fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style RegisterForm fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style ForgotForm fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style ResetForm fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style AuthService fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style Middleware fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style SupabaseClient fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style GenerateWizard fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5
    style AppLayout fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style ProtectedRoute fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px
    style PublicRoute fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
```

</mermaid_diagram>

## Opis diagramu

Diagram przedstawia kompleksową architekturę modułu autentykacji i rejestracji dla aplikacji 10x-LinguaPairs. Pokazuje:

### Kluczowe elementy:

1. **Przepływ autentykacji**: Od użytkownika przez middleware do odpowiednich stron i komponentów
2. **Rozdzielenie tras**: Publiczne vs chronione z mechanizmem przekierowań
3. **Komponenty React**: Formularze autentykacji z walidacją i obsługą błędów
4. **Serwisy**: AuthService jako warstwa abstrakcji nad Supabase Auth
5. **Middleware**: Ochrona tras i wstrzykiwanie klienta Supabase
6. **Komponenty wymagające aktualizacji**: GenerateWizard wymaga integracji z autentykacją

### Kolorystyka:

- **Niebieski**: Layouty i infrastruktura
- **Pomarańczowy**: Formularze React
- **Fioletowy**: Serwisy
- **Zielony**: Middleware i trasy publiczne
- **Czerwony**: Trasy chronione i komponenty wymagające aktualizacji
- **Żółty**: Klient Supabase

### Przepływ danych:

1. Użytkownik → Middleware sprawdza autentykację
2. Middleware → Przekierowanie do odpowiedniej strony (publiczna/chroniona/auth)
3. Formularze → Walidacja Zod → AuthService → Supabase Auth
4. Błędy → Mapowanie przez auth.errors.ts → Wyświetlenie w UI
5. Sukces → Redirect z parametrem lub domyślna strona
