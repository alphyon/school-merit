import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';

// ─── Hoisted mocks (must be declared before vi.mock factories) ────────────────

const {
  mockNavigate,
  mockGetUser,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockIncrease,
  mockDecrease,
  mockFontScale,
  authStateCallback,
} = vi.hoisted(() => {
  const mockFontScale = { value: 'normal' as 'normal' | 'large' | 'xl' };
  // authStateCallback captures the callback passed to onAuthStateChange
  // so tests can invoke it to simulate auth events
  const authStateCallback = { fn: null as ((event: string, session: any) => void) | null };
  return {
    mockNavigate: vi.fn(),
    mockGetUser: vi.fn(),
    mockGetSession: vi.fn(),
    mockOnAuthStateChange: vi.fn((callback: (event: string, session: any) => void) => {
      authStateCallback.fn = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    mockSignOut: vi.fn(),
    mockIncrease: vi.fn(),
    mockDecrease: vi.fn(),
    mockFontScale,
    authStateCallback,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// El mock de useFontSize usa mockFontScale.value como referencia mutable
// para que cada test pueda controlar el scale actual sin re-importar el módulo.
vi.mock('../hooks/useFontSize', () => ({
  useFontSize: () => ({
    get scale() {
      return mockFontScale.value;
    },
    increase: mockIncrease,
    decrease: mockDecrease,
  }),
}));

vi.mock('../components/ChangePasswordModal', () => ({
  default: () => null,
}));

vi.mock('../components/Footer', () => ({
  Footer: () => null,
}));

vi.mock('@heroui/react', () => ({
  Avatar: () => <div data-testid="avatar" />,
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  useDisclosure: () => ({ isOpen: false, onOpen: vi.fn(), onOpenChange: vi.fn() }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import DashboardLayout from './DashboardLayout';

interface RenderLayoutOptions {
  role?: 'docente' | 'admin';
  initialPath?: string;
}

function renderLayout({ role = 'docente', initialPath = '/' }: RenderLayoutOptions = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DashboardLayout role={role}>
        <div>contenido</div>
      </DashboardLayout>
    </MemoryRouter>,
  );
}

function makeUser(): User {
  return { id: 'user-1', email: 'test@school.edu' } as User;
}

function makeSession(user?: User): Session {
  return { user: user ?? makeUser(), access_token: 'tok' } as Session;
}

function setupOnlineSession() {
  mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardLayout – sesión y navegación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    // Restablecer como online por defecto
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    // En jsdom, localStorage puede no tener .clear como función directa
    // Usamos la API de vitest para limpiar el storage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  it('online: redirige al login si no hay sesión válida', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });

    renderLayout();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('online: NO redirige si hay sesión válida', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('contenido')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });

  it('offline: NO redirige si hay sesión cacheada en localStorage', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    mockGetSession.mockResolvedValue({ data: { session: makeSession() }, error: null });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('contenido')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
    // getUser nunca debe llamarse cuando offline
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('offline: redirige al login si NO hay sesión cacheada', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    renderLayout();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('offline: error de red en getUser NO redirige', async () => {
    // Este test valida el guard en el bloque catch: si navigator.onLine es false
    // cuando se captura el error, no debe redirigir al login.
    // Simulamos: primera lectura de onLine = true (pasa el guard inicial),
    // luego cambia a false antes del catch.
    let callCount = 0;
    Object.defineProperty(navigator, 'onLine', {
      get() {
        callCount++;
        // Primera lectura: entra al bloque online y llama getUser
        // Lecturas siguientes (catch): offline → no redirige
        return callCount <= 1;
      },
      configurable: true,
    });

    mockGetUser.mockRejectedValue(new Error('Network request failed'));

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('contenido')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });
});

// ─── Font size controls ───────────────────────────────────────────────────────

describe('DashboardLayout – controles de tamaño de fuente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    setupOnlineSession();
  });

  it('botón A+ llama increase al hacer click', async () => {
    const user = userEvent.setup();
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    await user.click(screen.getByTitle('Aumentar fuente'));

    expect(mockIncrease).toHaveBeenCalledTimes(1);
  });

  it('botón A- llama decrease al hacer click', async () => {
    const user = userEvent.setup();
    mockFontScale.value = 'large';
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    await user.click(screen.getByTitle('Reducir fuente'));

    expect(mockDecrease).toHaveBeenCalledTimes(1);
  });

  it('botón A- está deshabilitado cuando scale === "normal"', async () => {
    mockFontScale.value = 'normal';
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    expect(screen.getByTitle('Reducir fuente')).toBeDisabled();
  });

  it('botón A+ está deshabilitado cuando scale === "xl"', async () => {
    mockFontScale.value = 'xl';
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    expect(screen.getByTitle('Aumentar fuente')).toBeDisabled();
  });
});

// ─── Logout flow ──────────────────────────────────────────────────────────────

describe('DashboardLayout – flujo de logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    setupOnlineSession();
    mockSignOut.mockResolvedValue({});
  });

  it('click en "Cerrar Sesión" llama supabase.auth.signOut()', async () => {
    const user = userEvent.setup();
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    await user.click(screen.getByText('Cerrar Sesión'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('después del logout llama localStorage.clear()', async () => {
    const user = userEvent.setup();
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    await user.click(screen.getByText('Cerrar Sesión'));

    await waitFor(() => {
      expect(localStorage.clear).toHaveBeenCalled();
    });
  });

  it('después del logout navega a /login', async () => {
    const user = userEvent.setup();
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    await user.click(screen.getByText('Cerrar Sesión'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});

// ─── Auth state change listener ───────────────────────────────────────────────

describe('DashboardLayout – onAuthStateChange listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    setupOnlineSession();
    mockSignOut.mockResolvedValue({});
  });

  it('SIGNED_OUT online → redirige a /login', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    expect(authStateCallback.fn).not.toBeNull();

    act(() => {
      authStateCallback.fn!('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('!session online → redirige a /login', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    act(() => {
      authStateCallback.fn!('TOKEN_REFRESHED', null);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('SIGNED_OUT offline → NO redirige (evita falsos positivos)', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Cambiar a offline ANTES de disparar el evento
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    act(() => {
      authStateCallback.fn!('SIGNED_OUT', null);
    });

    // Con !navigator.onLine el guard no debe redirigir
    // Esperamos un breve tiempo y verificamos que NO se llame a /login
    await new Promise(r => setTimeout(r, 50));
    expect(mockNavigate).not.toHaveBeenCalledWith('/login');
  });
});

// ─── School config & user data rendering ─────────────────────────────────────

describe('DashboardLayout – school config y datos de usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    setupOnlineSession();
  });

  it('carga config de escuela desde Supabase y actualiza estado', async () => {
    // localStorage retorna null → no hay cached_user ni cached_config
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    const { supabase } = await import('../lib/supabase');
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'perfiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { full_name: 'Juan Docente', role: 'docente' }, error: null }),
        };
      }
      if (table === 'configuracion_sistema') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { nombre_escuela: 'Escuela Test', logo_url: '' }, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('contenido')).toBeInTheDocument();
    });

    // El nombre se cargó desde Supabase y se muestra
    await waitFor(() => {
      expect(screen.getAllByText('Juan Docente').length).toBeGreaterThan(0);
    });
  });

  it('usa userData del cache de localStorage si existe', async () => {
    // El componente inicializa con JSON.parse(localStorage.getItem('cached_user') || 'null')
    // Si el localStorage tiene datos, los usa como estado inicial
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === 'cached_user') return JSON.stringify({ name: 'Ana Docente', email: 'ana@test.com' });
        if (key === 'cached_config') return JSON.stringify({ name: 'Mi Escuela', logo: '' });
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    renderLayout();

    // El nombre está en el DOM desde el inicio (initial state)
    expect(screen.getAllByText('Ana Docente').length).toBeGreaterThan(0);
  });

  it('muestra "SISTEMA" si no hay config en localStorage', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    renderLayout();

    // El config inicial tiene name: "SISTEMA"
    expect(screen.getByText('SISTEMA')).toBeInTheDocument();
  });

  it('setItem guarda el config en localStorage cuando Supabase devuelve datos', async () => {
    // Cuando Supabase devuelve configuración, el componente la guarda en localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });

    const { supabase } = await import('../lib/supabase');
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'perfiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { full_name: 'Docente X', role: 'docente' }, error: null }),
        };
      }
      if (table === 'configuracion_sistema') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { nombre_escuela: 'Colegio Z', logo_url: 'http://logo.png' }, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('contenido')).toBeInTheDocument();
    });

    // El componente guarda en localStorage
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('cached_user', expect.stringContaining('Docente X'));
    });
  });
});

// ─── Mobile sidebar open/close ────────────────────────────────────────────────

describe('DashboardLayout – sidebar mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    setupOnlineSession();
    mockSignOut.mockResolvedValue({});
  });

  it('abre el sidebar mobile al hacer click en el botón burger', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // El burger button es el <button class="p-3 bg-gray-100 ..."> antes del span "SGE"
    // Buscamos por su clase específica usando querySelector
    const burgerButton = document.querySelector('button.p-3.bg-gray-100') as HTMLElement;
    expect(burgerButton).not.toBeNull();

    fireEvent.click(burgerButton!);

    expect(screen.getByText('Menú')).toBeInTheDocument();
  });

  it('cierra el sidebar mobile al hacer click en el botón X', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Abrir sidebar usando fireEvent directamente
    const burgerButton = document.querySelector('button.p-3.bg-gray-100') as HTMLElement;
    fireEvent.click(burgerButton!);

    expect(screen.getByText('Menú')).toBeInTheDocument();

    // El botón X tiene clase "p-2 bg-white/10 rounded-xl" dentro del sidebar
    const xButton = document.querySelector('button.p-2.bg-white\\/10') as HTMLElement;
    if (xButton) {
      fireEvent.click(xButton);
      expect(screen.queryByText('Menú')).not.toBeInTheDocument();
    } else {
      // Fallback: el texto "Menú" tiene un hermano button siguiente
      const menuText = screen.getByText('Menú');
      const closeBtn = menuText.nextElementSibling as HTMLElement;
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(screen.queryByText('Menú')).not.toBeInTheDocument();
      }
    }
  });

  it('navega al hacer click en un link del sidebar mobile', async () => {
    renderLayout({ role: 'admin' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Abrir sidebar mobile
    const burgerButton = document.querySelector('button.p-3.bg-gray-100') as HTMLElement;
    fireEvent.click(burgerButton!);

    expect(screen.getByText('Menú')).toBeInTheDocument();

    // Click en el link "Inicio" del sidebar mobile — hay múltiples
    const inicioButtons = screen.getAllByText('Inicio');
    // El del sidebar mobile es el último (después del desktop sidebar)
    fireEvent.click(inicioButtons[inicioButtons.length - 1]);

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('navega al hacer click en link del sidebar desktop', async () => {
    const user = userEvent.setup();
    renderLayout({ role: 'admin' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Click en "Estudiantes" en el sidebar desktop
    const estudiantesButtons = screen.getAllByText('Estudiantes');
    await user.click(estudiantesButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/estudiantes');
  });

  it('cierra sidebar mobile al hacer click en el overlay', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Abrir sidebar
    const burgerButton = document.querySelector('button.p-3.bg-gray-100') as HTMLElement;
    fireEvent.click(burgerButton!);

    expect(screen.getByText('Menú')).toBeInTheDocument();

    // Click en el overlay — tiene onClick={() => setIsSidebarOpen(false)}
    // El overlay es el div con clase "fixed inset-0 bg-black/60 ..."
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(screen.queryByText('Menú')).not.toBeInTheDocument();
    }
  });

  it('sidebar mobile: cierra sesión desde el botón Cerrar Sesión del sidebar', async () => {
    renderLayout();

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // Abrir sidebar mobile
    const burgerButton = document.querySelector('button.p-3.bg-gray-100') as HTMLElement;
    fireEvent.click(burgerButton!);

    expect(screen.getByText('Menú')).toBeInTheDocument();

    // Hay múltiples "Cerrar Sesión" — uno en el dropdown del header y otro en el sidebar mobile
    const cerrarButtons = screen.getAllByText('Cerrar Sesión');
    // El del sidebar mobile es el último
    fireEvent.click(cerrarButtons[cerrarButtons.length - 1]);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('el header muestra el label de la ruta activa en desktop', async () => {
    renderLayout({ role: 'admin', initialPath: '/admin/estudiantes' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // El header lg:block muestra el label del link activo
    expect(screen.getAllByText('Estudiantes').length).toBeGreaterThan(0);
  });
});

// ─── Navigation sidebar ───────────────────────────────────────────────────────

describe('DashboardLayout – sidebar de navegación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontScale.value = 'normal';
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    setupOnlineSession();
  });

  it('renderiza links de navegación para rol docente', async () => {
    renderLayout({ role: 'docente' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    expect(screen.getAllByText('Mis Alumnos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reportes').length).toBeGreaterThan(0);
    // No debe mostrar links exclusivos de admin
    expect(screen.queryByText('Estudiantes')).not.toBeInTheDocument();
  });

  it('renderiza links de navegación para rol admin', async () => {
    renderLayout({ role: 'admin' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    expect(screen.getAllByText('Estudiantes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Docentes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grupos').length).toBeGreaterThan(0);
    // No debe mostrar links exclusivos de docente
    expect(screen.queryByText('Mis Alumnos')).not.toBeInTheDocument();
  });

  it('link activo tiene la clase de estilo activo según pathname', async () => {
    renderLayout({ role: 'admin', initialPath: '/admin' });

    await waitFor(() => expect(screen.getByText('contenido')).toBeInTheDocument());

    // El link "Inicio" apunta a /admin — debe tener el estilo activo (bg-white text-[#1e3b8a])
    // El sidebar desktop renderiza los links como <button>; buscamos el primero que tenga "Inicio"
    const activeButtons = screen.getAllByText('Inicio');
    const activeButton = activeButtons.find(
      (el) => el.tagName === 'BUTTON' || el.closest('button') !== null,
    );
    const btn = activeButton?.closest('button') ?? activeButton;

    expect(btn?.className).toMatch(/bg-white/);
    expect(btn?.className).toMatch(/text-\[#1e3b8a\]/);
  });
});
