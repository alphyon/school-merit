import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockUpdateUser, mockUpdateUserById } = vi.hoisted(() => ({
  mockUpdateUser: vi.fn(),
  mockUpdateUserById: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: mockUpdateUser,
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  },
}));

// Notification renderiza el mensaje en un <p> para que podamos buscarlo por texto.
// También expone el botón de cierre para cubrir el handler onClose={() => setNotification(null)}
vi.mock('./Notification', () => ({
  Notification: ({ message, onClose }: { message: string; onClose?: () => void }) => (
    <p role="alert">
      {message}
      <button data-testid="notification-close" onClick={onClose}>×</button>
    </p>
  ),
}));

// HeroUI: Modal sólo renderiza si isOpen=true.
// ModalContent usa render-prop — debe invocar children(onClose).
vi.mock('@heroui/react', () => {
  const mockOnClose = vi.fn();
  return {
    Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
      isOpen ? <div data-testid="modal">{children}</div> : null,
    ModalContent: ({ children }: { children: (onClose: () => void) => React.ReactNode }) => (
      <div>{children(mockOnClose)}</div>
    ),
    ModalHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModalBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Button: ({
      children,
      onPress,
      isLoading,
      disabled,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      isLoading?: boolean;
      disabled?: boolean;
    }) => (
      <button onClick={onPress} disabled={isLoading || disabled}>
        {isLoading ? 'Cargando...' : children}
      </button>
    ),
    Input: ({
      label,
      value,
      onValueChange,
      type,
      endContent,
    }: {
      label: string;
      value: string;
      onValueChange: (v: string) => void;
      type?: string;
      endContent?: React.ReactNode;
    }) => (
      <div>
        <label>
          {label}
          <input
            aria-label={label}
            type={type ?? 'text'}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
          />
        </label>
        {endContent}
      </div>
    ),
  };
});

// ─── Component under test ─────────────────────────────────────────────────────

import ChangePasswordModal from './ChangePasswordModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RenderModalOptions {
  targetUserId?: string;
}

function renderModal({ targetUserId }: RenderModalOptions = {}) {
  const onOpenChange = vi.fn();
  render(
    <ChangePasswordModal isOpen={true} onOpenChange={onOpenChange} targetUserId={targetUserId} />,
  );
  return { onOpenChange };
}


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChangePasswordModal – validaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra error si la nueva contraseña tiene menos de 6 caracteres', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), '123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), '123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(
      await screen.findByText('La contraseña debe tener al menos 6 caracteres'),
    ).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('muestra error si las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'password123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'diferente123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('ChangePasswordModal – self password change (sin targetUserId)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Garantiza cleanup de fake timers si algún test los activa
  afterEach(() => {
    vi.useRealTimers();
  });

  it('llama supabase.auth.updateUser() con la nueva contraseña', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'nuevaClave123' });
    });
  });

  it('muestra "Tu contraseña ha sido actualizada" al completar con éxito', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(
      await screen.findByText('Tu contraseña ha sido actualizada con éxito'),
    ).toBeInTheDocument();
  });

  it('invoca onClose después de 1500ms del éxito', async () => {
    // Use real timers for userEvent interaction (typing/clicking) — fake timers interfere
    // with userEvent's internal async scheduling and cause test timeouts.
    // We spy on setTimeout directly to verify the 1500ms delay is scheduled.
    const originalSetTimeout = globalThis.setTimeout;
    let capturedCallback: (() => void) | null = null;
    let capturedDelay: number | null = null;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((fn: TimerHandler, delay?: number) => {
        if (typeof fn === 'function' && delay === 1500) {
          capturedCallback = fn as () => void;
          capturedDelay = delay;
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
        return originalSetTimeout(fn as TimerHandler, delay);
      }) as typeof globalThis.setTimeout,
    );

    mockUpdateUser.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    // El mensaje de éxito aparece después de drenar el microtask queue
    expect(
      await screen.findByText('Tu contraseña ha sido actualizada con éxito'),
    ).toBeInTheDocument();

    // Antes del timeout el modal sigue abierto
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    // Verify the 1500ms setTimeout was scheduled
    expect(capturedDelay).toBe(1500);
    expect(capturedCallback).not.toBeNull();

    // Manually invoke the captured callback (simulates timer firing)
    await act(async () => {
      capturedCallback!();
    });

    // mockUpdateUser fue llamado exactamente una vez (no hubo doble submit)
    expect(mockUpdateUser).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });
});

describe('ChangePasswordModal – force password (con targetUserId — admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama supabaseAdmin.auth.admin.updateUserById() con el targetUserId', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderModal({ targetUserId: 'admin-target-42' });

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'forzada123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'forzada123');
    await user.click(screen.getByText('Actualizar Clave'));

    await waitFor(() => {
      expect(mockUpdateUserById).toHaveBeenCalledWith('admin-target-42', {
        password: 'forzada123',
      });
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('muestra "Contraseña forzada con éxito" al completar', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderModal({ targetUserId: 'admin-target-42' });

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'forzada123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'forzada123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(
      await screen.findByText('Contraseña forzada con éxito por el Admin'),
    ).toBeInTheDocument();
  });
});

describe('ChangePasswordModal – error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el mensaje de error cuando Supabase devuelve error', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Token expirado' } });
    const user = userEvent.setup({ delay: null });
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(await screen.findByText('Error: Token expirado')).toBeInTheDocument();
  });

  it('muestra error cuando supabase lanza una excepción', async () => {
    mockUpdateUser.mockRejectedValue(new Error('Network failure'));
    const user = userEvent.setup({ delay: null });
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    expect(await screen.findByText('Error: Network failure')).toBeInTheDocument();
  });
});

describe('ChangePasswordModal – notification dismiss (L64)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('la notificación se muestra y el botón × llama setNotification(null) ocultándola', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Sesión expirada' } });
    const user = userEvent.setup({ delay: null });
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    const notification = await screen.findByRole('alert');
    expect(notification).toBeInTheDocument();
    expect(notification.textContent).toContain('Error');

    // Click en el botón × del Notification mock — invoca onClose={() => setNotification(null)}
    await user.click(screen.getByTestId('notification-close'));

    // La notificación debe desaparecer
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('admin: notificación de éxito aparece con targetUserId', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null });
    const user = userEvent.setup({ delay: null });
    renderModal({ targetUserId: 'some-user-id' });

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'admin123456');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'admin123456');
    await user.click(screen.getByText('Actualizar Clave'));

    const notification = await screen.findByRole('alert');
    expect(notification).toBeInTheDocument();
    expect(notification.textContent).toContain('éxito');
  });
});

describe('ChangePasswordModal – UI states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('botón submit está deshabilitado mientras isSubmitting', async () => {
    // Simulamos una promesa que nunca resuelve para mantener isSubmitting=true
    mockUpdateUser.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup({ delay: null });
    renderModal();

    await user.type(screen.getByLabelText('Nueva Contraseña'), 'nuevaClave123');
    await user.type(screen.getByLabelText('Confirmar Contraseña'), 'nuevaClave123');
    await user.click(screen.getByText('Actualizar Clave'));

    // El botón queda en estado isLoading=true → disabled
    await waitFor(() => {
      expect(screen.getByText('Cargando...')).toBeDisabled();
    });
  });

  it('toggle de visibilidad cambia el type del input de contraseña', async () => {
    const user = userEvent.setup();
    renderModal();

    const passwordInput = screen.getByLabelText('Nueva Contraseña');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // El eye button no tiene texto — buscamos el button que NO es Cancelar ni Actualizar
    const allButtons = screen.getAllByRole('button');
    // Los botones conocidos son: Cancelar, Actualizar Clave + el toggle
    const knownLabels = ['Cancelar', 'Actualizar Clave'];
    const eyeButton = allButtons.find(
      (btn) => !knownLabels.includes(btn.textContent ?? ''),
    );

    expect(eyeButton).toBeDefined();
    await user.click(eyeButton!);

    // Después del toggle, el type debe cambiar a text
    expect(screen.getByLabelText('Nueva Contraseña')).toHaveAttribute('type', 'text');
  });
});
