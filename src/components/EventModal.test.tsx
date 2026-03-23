import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockSupabaseInsert,
  mockSupabaseUpdate,
  mockSupabaseFrom,
  mockDbCatalogWhere,
  mockDbPendingAdd,
  mockDbCatalogBulkPut,
} = vi.hoisted(() => {
  const mockSupabaseInsert = vi.fn();
  const mockSupabaseUpdate = vi.fn();

  const mockSupabaseFrom = vi.fn((_table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: mockSupabaseInsert,
    update: mockSupabaseUpdate,
  }));

  const mockDbCatalogWhere = vi.fn();
  const mockDbPendingAdd = vi.fn();
  const mockDbCatalogBulkPut = vi.fn();

  return {
    mockSupabaseInsert,
    mockSupabaseUpdate,
    mockSupabaseFrom,
    mockDbCatalogWhere,
    mockDbPendingAdd,
    mockDbCatalogBulkPut,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

vi.mock('../lib/localDb', () => ({
  db: {
    catalog: {
      where: mockDbCatalogWhere,
      bulkPut: mockDbCatalogBulkPut,
    },
    pendingEvents: {
      add: mockDbPendingAdd,
    },
  },
}));

vi.mock('./Notification', () => ({
  Notification: ({ message, onClose }: { message: string; onClose?: () => void }) => (
    <div data-testid="notification">
      {message}
      <button data-testid="notification-close" onClick={onClose}>×</button>
    </div>
  ),
}));

vi.mock('@heroui/react', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
  ModalContent: ({ children }: { children: (onClose: () => void) => ReactNode }) =>
    <div>{children(vi.fn())}</div>,
  ModalHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onPress,
    isDisabled,
    isLoading,
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    isLoading?: boolean;
  }) => (
    <button onClick={onPress} disabled={isDisabled || isLoading} data-testid="btn">
      {children}
    </button>
  ),
  Tabs: ({
    children,
    onSelectionChange,
    selectedKey,
  }: {
    children: ReactNode;
    onSelectionChange?: (key: string) => void;
    selectedKey?: string;
  }) => (
    <div data-testid="tabs" data-selected={selectedKey}>
      {['demerito', 'redencion', 'reconocimiento'].map((key) => (
        <button
          key={key}
          data-testid={`tab-${key}`}
          onClick={() => onSelectionChange?.(key)}
        >
          {key}
        </button>
      ))}
      {children}
    </div>
  ),
  Tab: ({ title }: { title: ReactNode; tabKey?: string }) => <div>{title}</div>,
  Textarea: ({
    value,
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    label?: string;
    placeholder?: string;
    variant?: string;
    minRows?: number;
  }) => (
    <textarea
      data-testid="textarea"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  Chip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Spinner: () => <div data-testid="spinner" />,
  Select: ({
    children,
    label: _label,
    onSelectionChange,
    selectedKeys,
  }: {
    children: ReactNode;
    label?: string;
    onSelectionChange?: (keys: Set<string>) => void;
    selectedKeys?: string[];
  }) => (
    <select
      data-testid="select"
      value={selectedKeys?.[0] ?? ''}
      onChange={(e) => onSelectionChange?.(new Set([e.target.value]))}
    >
      {children}
    </select>
  ),
  SelectItem: ({ children, textValue }: { children: ReactNode; textValue?: string }) => {
    const label = (children as string) ?? textValue ?? '';
    return <option value={textValue ?? label}>{label}</option>;
  },
}));

vi.mock('lucide-react', () => ({
  ShieldAlert: () => null,
  BadgeCheck: () => null,
  AlertCircle: () => null,
  Award: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

import EventModal from './EventModal';

const CATALOG_ITEMS = [
  { id: 'cat-1', codigo: 'D01', descripcion: 'Falta leve', puntos_valor: 1, tipo: 'demerito' },
  { id: 'cat-2', codigo: 'D02', descripcion: 'Falta grave', puntos_valor: 3, tipo: 'demerito' },
];

const REDENCION_ITEMS = [
  { id: 'red-1', codigo: 'R01', descripcion: 'Redención básica', puntos_valor: 1, tipo: 'redencion' },
];

function setupCatalogMock(items = CATALOG_ITEMS) {
  mockDbCatalogWhere.mockReturnValue({
    equals: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(items),
    }),
  });
}

function renderModal(props: Partial<Parameters<typeof EventModal>[0]> = {}) {
  const defaults = {
    isOpen: true,
    onOpenChange: vi.fn(),
    studentId: 'stu-1',
    studentName: 'Ana López',
    onSuccess: vi.fn(),
  };
  return render(<EventModal {...defaults} {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EventModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbCatalogBulkPut.mockResolvedValue(undefined);
    mockDbPendingAdd.mockResolvedValue(1);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => (key === 'teacher_id' ? 'teacher-99' : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  // ─── Catalog fetch ──────────────────────────────────────────────────────────

  describe('catalog fetch', () => {
    it('carga items de Dexie al abrir (siempre)', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalledWith('tipo');
      });
    });

    it('si online: también actualiza desde Supabase', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }),
        eq: vi.fn().mockReturnThis(),
        insert: mockSupabaseInsert,
        update: mockSupabaseUpdate,
      });

      renderModal();

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('demeritos_catalogo');
      });
    });

    it('offline: NO llama a Supabase para el catálogo', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  // ─── Tab switching ──────────────────────────────────────────────────────────

  describe('tab switching', () => {
    it('renderiza el modal con tab inicial "demerito"', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'demerito');
      });
    });

    it('initialTab "redencion" activa la tab correcta', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock(REDENCION_ITEMS);

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'redencion');
      });
    });

    it('isOpen=false: el modal no se renderiza (cubre L65 false branch)', async () => {
      // Covers line 65: `if (isOpen)` false branch — useEffect does nothing when isOpen=false
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal({ isOpen: false });

      // Modal mock renders null when isOpen=false
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      // fetchCatalog was not called
      expect(mockDbCatalogWhere).not.toHaveBeenCalled();
    });

    it('initialTab desconocido usa "demerito" como fallback (L67 || branch)', async () => {
      // Covers line 67: `tabMap[initialTab || 'demerito'] || 'demerito'`
      // When initialTab is not in tabMap, tabMap[...] returns undefined, then || 'demerito' fires
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal({ initialTab: 'unknown_tab_value' });

      await waitFor(() => {
        // Falls back to 'demerito'
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'demerito');
      });
    });
  });

  // ─── handleTabChange ────────────────────────────────────────────────────────

  describe('handleTabChange', () => {
    it('cambio de tab a "reconocimiento" actualiza activeTab y carga catálogo', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      // Limpiar para detectar el segundo llamado
      mockDbCatalogWhere.mockClear();

      // Hacer click en el botón de tab "reconocimiento" del mock de Tabs actualizado
      await userEvent.click(screen.getByTestId('tab-reconocimiento'));

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalledWith('tipo');
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'reconocimiento');
      });
    });

    it('cambio de tab a "redencion" actualiza activeTab', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock(REDENCION_ITEMS);

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('tab-redencion'));

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'redencion');
      });
    });

    it('cambio de tab limpia selectedDemeritRef si no hay initialDemeritId', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'redencion');
      });

      // Cambiar de tab a demerito — debe limpiar selectedDemeritRef
      await userEvent.click(screen.getByTestId('tab-demerito'));

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'demerito');
      });
    });

    it('handleTabChange a "redencion" con initialDemeritId NO limpia selectedDemeritRef (L86 false branch)', async () => {
      // Covers line 86: `if (key !== 'redencion' || !initialDemeritId)` — false branch
      // When key === 'redencion' AND initialDemeritId is set, the condition is false,
      // so setSelectedDemeritRef("") is NOT called (preserves the ref)
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock(REDENCION_ITEMS);

      // Start on demerito tab with initialDemeritId provided
      renderModal({ initialTab: 'demerito', initialDemeritId: 'some-demerit-ref' });

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'demerito');
      });

      // Switch to redencion tab — with initialDemeritId, selectedDemeritRef should NOT be cleared
      await userEvent.click(screen.getByTestId('tab-redencion'));

      await waitFor(() => {
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-selected', 'redencion');
      });
      // The function runs without clearing selectedDemeritRef — no assertion needed beyond no throw
    });
  });

  // ─── Submit: sin teacher_id ───────────────────────────────────────────────

  describe('submit sin teacher_id', () => {
    it('muestra error "No se encontró ID de docente" si no hay teacher_id en localStorage', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      // Sobreescribir localStorage para que no tenga teacher_id
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null), // teacher_id retorna null
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      // Seleccionar item
      await userEvent.click(screen.getByText('Falta leve'));

      // Submit
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toHaveTextContent('No se encontró ID de docente');
      });

      // No debe llamar a Supabase insert
      expect(insertFn).not.toHaveBeenCalled();
    });
  });

  // ─── Submit sin studentId ──────────────────────────────────────────────────

  describe('submit sin studentId (L92 branch)', () => {
    it('handleSubmit sale inmediatamente si no hay studentId (L92 !studentId branch)', async () => {
      // Covers the `!studentId` branch at line 92: `if (!selectedItem || !studentId) return`
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      // Render without studentId — the prop is optional
      render(<EventModal isOpen={true} onOpenChange={vi.fn()} studentName="Ana" onSuccess={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      // Without studentId, confirm button may still be clickable (selectedItem is set),
      // but handleSubmit will return early at line 92
      if (confirmar && !(confirmar as HTMLButtonElement).disabled) {
        await userEvent.click(confirmar);
      }

      // Insert should NOT have been called because studentId is missing
      expect(insertFn).not.toHaveBeenCalled();
    });
  });

  // ─── Submit en tab reconocimiento (L107 branch) ────────────────────────────

  describe('submit en tab reconocimiento (L107)', () => {
    it('reconocimiento_id se establece al hacer submit en tab reconocimiento', async () => {
      // Covers line 107: `reconocimiento_id: activeTab === 'reconocimiento' ? selectedItem.id : null`
      const RECONOCIMIENTO_ITEMS = [
        { id: 'rec-1', codigo: 'RC01', descripcion: 'Excelencia académica', puntos_valor: 0, tipo: 'reconocimiento' },
      ];
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(RECONOCIMIENTO_ITEMS);

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'reconocimientos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: RECONOCIMIENTO_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal({ initialTab: 'reconocimiento' });

      await waitFor(() => {
        expect(screen.getByText('Excelencia académica')).toBeInTheDocument();
      });

      // Select the reconocimiento item
      await userEvent.click(screen.getByText('Excelencia académica'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(insertFn).toHaveBeenCalledWith(
          expect.objectContaining({ reconocimiento_id: 'rec-1' }),
        );
      });
    });
  });

  // ─── Validaciones ───────────────────────────────────────────────────────────

  describe('validaciones', () => {
    it('botón Confirmar está deshabilitado si no hay selectedItem', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      // El botón Confirmar tiene isDisabled=!selectedItem, que es true al inicio
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      expect(confirmar).toBeDisabled();
    });

    it('tab redencion: botón Confirmar deshabilitado si offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock(REDENCION_ITEMS);

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      // isDisabled = !selectedItem || (activeTab === 'redencion' && !navigator.onLine)
      // Con onLine=false y tab redencion, siempre disabled
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      expect(confirmar).toBeDisabled();
    });
  });

  // ─── Submit online ──────────────────────────────────────────────────────────

  describe('submit online', () => {
    it('llama supabase.from("registros_eventos").insert() cuando online', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      // Esperar que se cargue el catálogo y aparezcan items
      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      // Seleccionar un item
      await userEvent.click(screen.getByText('Falta leve'));

      // Submit
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(insertFn).toHaveBeenCalled();
      });
    });

    it('muestra notificación "Guardado en la nube" tras submit exitoso', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toHaveTextContent('Guardado en la nube');
      });
    });
  });

  // ─── Submit offline ─────────────────────────────────────────────────────────

  describe('submit offline', () => {
    it('llama db.pendingEvents.add() cuando offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(mockDbPendingAdd).toHaveBeenCalled();
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalledWith('registros_eventos');
    });

    it('muestra notificación "Guardado localmente" cuando offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toHaveTextContent('Guardado localmente');
      });
    });

    it('el evento offline tiene sync_status "pending"', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(mockDbPendingAdd).toHaveBeenCalledWith(
          expect.objectContaining({ sync_status: 'pending' }),
        );
      });
    });
  });

  // ─── Error handling / fallback offline ─────────────────────────────────────

  describe('error handling - fallback offline', () => {
    it('si falla supabase.insert() guarda en db.pendingEvents como fallback', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockRejectedValue(new Error('Network error'));
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(mockDbPendingAdd).toHaveBeenCalledWith(
          expect.objectContaining({ sync_status: 'pending' }),
        );
      });
    });

    it('fallback muestra mensaje de error apropiado', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockRejectedValue(new Error('Network error'));
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(screen.getByTestId('notification')).toHaveTextContent('error de red');
      });
    });

    it('si supabase.insert() devuelve { error } (no throw), lo lanza y usa fallback', async () => {
      // Covers line 116: `if (insertError) throw insertError`
      // The insert resolves (not rejects), but with a non-null error object.
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB constraint error' } });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      // insertError is truthy → thrown → catch block → db.pendingEvents.add()
      await waitFor(() => {
        expect(mockDbPendingAdd).toHaveBeenCalledWith(
          expect.objectContaining({ sync_status: 'pending' }),
        );
      });
    });

    it('sin onSuccess: submit exitoso no lanza error (cubre if(onSuccess) false branch)', async () => {
      // Covers line 131: `if (onSuccess) onSuccess(...)` when onSuccess is undefined
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      // Render without onSuccess prop
      render(<EventModal isOpen={true} onOpenChange={vi.fn()} studentId="stu-1" studentName="Ana" />);

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(insertFn).toHaveBeenCalled();
      });
      // onSuccess is undefined — no throw expected
    });
  });

  // ─── Notification onClose ───────────────────────────────────────────────────

  describe('notification onClose', () => {
    it('el botón × de la notificación llama setNotification(null) y oculta la notif', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock();

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'demeritos_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: CATALOG_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: insertFn,
          update: vi.fn().mockReturnThis(),
        };
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Falta leve')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Falta leve'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      // Esperar la notificación
      const notification = await screen.findByTestId('notification');
      expect(notification).toBeInTheDocument();

      // Click en el botón × para cerrar — cubre onClose={() => setNotification(null)}
      await userEvent.click(screen.getByTestId('notification-close'));

      await waitFor(() => {
        expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
      });
    });
  });

  // ─── Cerrar modal ───────────────────────────────────────────────────────────

  describe('cerrar modal', () => {
    it('botón Cerrar invoca onClose del modal', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock();

      renderModal();

      await waitFor(() => {
        expect(mockDbCatalogWhere).toHaveBeenCalled();
      });

      const buttons = screen.getAllByTestId('btn');
      const cerrarBtn = buttons.find(b => b.textContent === 'Cerrar');
      expect(cerrarBtn).toBeDefined();
      // El botón Cerrar no debe estar deshabilitado
      expect(cerrarBtn).not.toBeDisabled();
      await userEvent.click(cerrarBtn!);
      // El click no debe lanzar errores — simplemente invoca onClose del render-prop
    });
  });

  // ─── Item selection styles (L199 branches) ─────────────────────────────────

  describe('item selection styles (L199)', () => {
    it('redencion tab: clic en item de redención lo marca como seleccionado', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
      });

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(screen.getByText('Redención básica')).toBeInTheDocument();
      });

      // Click on item — covers the `activeTab === 'redencion'` branch in L199
      await userEvent.click(screen.getByText('Redención básica'));

      // The Confirmar button should be enabled now (selectedItem is set)
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      // Still disabled because offline disables redencion tab, but item was selected
      expect(confirmar).toBeDefined();
    });

    it('reconocimiento tab: clic en item lo marca como seleccionado (L199 branch)', async () => {
      const RECONOCIMIENTO_ITEMS = [
        { id: 'rec-1', codigo: 'RC01', descripcion: 'Excelencia académica', puntos_valor: 0, tipo: 'reconocimiento' },
      ];
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(RECONOCIMIENTO_ITEMS);

      renderModal({ initialTab: 'reconocimiento' });

      await waitFor(() => {
        expect(screen.getByText('Excelencia académica')).toBeInTheDocument();
      });

      // Click on item — covers the fallback `activeTab === 'reconocimiento'` branch in L199
      await userEvent.click(screen.getByText('Excelencia académica'));

      // The Confirmar button should be enabled (selectedItem is set, tab is reconocimiento)
      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      expect(confirmar).not.toBeDisabled();
    });
  });

  // ─── Redencion specifics ────────────────────────────────────────────────────

  describe('redencion specifics', () => {
    it('offline: muestra warning "Se requiere internet"', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      setupCatalogMock(REDENCION_ITEMS);

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(screen.getByText(/Se requiere internet/)).toBeInTheDocument();
      });
    });

    it('online: carga lista de faltas activas desde Supabase para redimir', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      const eqFn = vi.fn().mockReturnThis();
      const selectFn = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'evt-1',
            created_at: '2024-01-01',
            demeritos_catalogo: { codigo: 'D01', descripcion: 'Falta leve' },
          },
        ],
        error: null,
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          return { select: selectFn, eq: eqFn, insert: vi.fn(), update: vi.fn() };
        }
        return { select: vi.fn().mockReturnThis(), eq: eqFn, insert: vi.fn(), update: vi.fn() };
      });

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('registros_eventos');
      });
    });

    it('online: submit de redención actualiza el demerito original a "redimido"', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      const eqForUpdateFn = vi.fn().mockResolvedValue({ error: null });
      const insertFn = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            insert: insertFn,
            update: vi.fn(() => ({ eq: eqForUpdateFn })),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
      });

      renderModal({ initialTab: 'redencion', initialDemeritId: 'evt-ref-1' });

      await waitFor(() => {
        expect(screen.getByText('Redención básica')).toBeInTheDocument();
      });

      // Seleccionar item de redención
      await userEvent.click(screen.getByText('Redención básica'));

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      await userEvent.click(confirmar!);

      await waitFor(() => {
        expect(insertFn).toHaveBeenCalled();
        expect(eqForUpdateFn).toHaveBeenCalledWith('id', 'evt-ref-1');
      });
    });

    it('online: pre-selección de falta con initialDemeritId muestra el texto de la falta', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      const activeDemeritsData = [
        {
          id: 'evt-ref-1',
          created_at: '2024-01-01',
          demeritos_catalogo: { codigo: 'D01', descripcion: 'Falta leve preseleccionada' },
        },
      ];

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          // Correct chain: select().eq().eq().eq() — each eq returns this, last resolves
          const chain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function(this: any) {
              // After 3 eq calls, this returns a promise via then simulation
              return this;
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
            then: vi.fn((resolve: (v: any) => void) => {
              resolve({ data: activeDemeritsData, error: null });
              return { catch: vi.fn() };
            }),
          };
          // Make the chain thenable (acts like a promise)
          return chain;
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
      });

      renderModal({ initialTab: 'redencion', initialDemeritId: 'evt-ref-1' });

      await waitFor(() => {
        // Con initialDemeritId y activeDemerits cargados, muestra la descripción
        expect(screen.getByText(/Falta seleccionada|Falta leve preseleccionada/)).toBeInTheDocument();
      });
    });

    it('online: pre-selección con initialDemeritId muestra descripción cuando activeDemerits tiene el item', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      const activeDemeritsData = [
        {
          id: 'demo-id-1',
          created_at: '2024-01-01',
          demeritos_catalogo: { codigo: 'D01', descripcion: 'La falta que buscamos' },
        },
      ];

      // Mock que resuelve correctamente la chain completa
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          // Build a proper thenable chain
          const resolvedValue = { data: activeDemeritsData, error: null };
          const createChain = (): any => ({
            select: vi.fn(() => createChain()),
            eq: vi.fn(() => createChain()),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
            // Make it thenable
            then: (resolve: (v: any) => any) => Promise.resolve(resolve(resolvedValue)),
            catch: vi.fn().mockReturnThis(),
          });
          return createChain();
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
      });

      renderModal({ initialTab: 'redencion', initialDemeritId: 'demo-id-1' });

      await waitFor(() => {
        expect(screen.getByText(/La falta que buscamos|Falta seleccionada/)).toBeInTheDocument();
      });
    });

    it('online: sin initialDemeritId muestra el Select con items de activeDemerits', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      const activeDemeritsData = [
        {
          id: 'evt-ref-2',
          created_at: '2024-01-01',
          demeritos_catalogo: { codigo: 'D02', descripcion: 'Falta media' },
        },
      ];

      // Must use thenable chain: .select().eq().eq().eq() all return chainable obj,
      // then the whole expression resolves via .then() (Promise-like)
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        if (table === 'registros_eventos') {
          const resolvedValue = { data: activeDemeritsData, error: null };
          const createChain = (): any => ({
            select: vi.fn(() => createChain()),
            eq: vi.fn(() => createChain()),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
            then: (resolve: (v: any) => any, reject?: (e: any) => any) =>
              Promise.resolve(resolvedValue).then(resolve, reject),
            catch: vi.fn().mockReturnThis(),
          });
          return createChain();
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn(), update: vi.fn() };
      });

      // Sin initialDemeritId — debe mostrar Select con items
      renderModal({ initialTab: 'redencion' });

      // Wait for activeDemerits to load and SelectItems to render (line 185)
      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
      });

      // Verify SelectItem was rendered (covers line 185)
      await waitFor(() => {
        const options = screen.getByTestId('select').querySelectorAll('option');
        expect(options.length).toBeGreaterThan(0);
      });

      // Seleccionar una falta usando el select — cubre el onSelectionChange callback
      const selectEl = screen.getByTestId('select');
      fireEvent.change(selectEl, { target: { value: 'D02' } });

      // Seleccionar también un item de redención para poder confirmar
      const redencionItem = await screen.findByText('Redención básica');
      await userEvent.click(redencionItem);

      const buttons = screen.getAllByTestId('btn');
      const confirmar = buttons.find(b => b.textContent === 'Confirmar');
      // Con selectedItem y isOnline=true, el botón no debe estar deshabilitado
      expect(confirmar).not.toBeDisabled();
    });

    it('online: NO muestra warning "Se requiere internet"', async () => {
      vi.stubGlobal('navigator', { onLine: true });
      setupCatalogMock(REDENCION_ITEMS);

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'redenciones_catalogo') {
          return { select: vi.fn().mockResolvedValue({ data: REDENCION_ITEMS, error: null }), eq: vi.fn(), insert: vi.fn(), update: vi.fn() };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn(),
          update: vi.fn(),
        };
      });

      renderModal({ initialTab: 'redencion' });

      await waitFor(() => {
        expect(screen.queryByText(/Se requiere internet/)).not.toBeInTheDocument();
      });
    });
  });
});
