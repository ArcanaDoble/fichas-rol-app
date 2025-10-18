import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inventory from './Inventory';

jest.mock('../../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

const mockFirestore = require('firebase/firestore');

jest.mock('./ItemGenerator', () => ({ onGenerate }) => (
  <div>
    <button onClick={() => onGenerate('Weapon')} type="button">
      Generar arma
    </button>
  </div>
));

describe('Inventory', () => {
  beforeEach(() => {
    mockFirestore.doc.mockReturnValue({});
    mockFirestore.getDoc.mockResolvedValue({ exists: () => false });
    mockFirestore.setDoc.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('muestra las secciones base del inventario', async () => {
    render(<Inventory playerName="Jugador" />);

    await waitFor(() => expect(mockFirestore.getDoc).toHaveBeenCalled());

    expect(screen.getByText('Inventario de compras')).toBeInTheDocument();
    expect(screen.getByText('Armas compradas')).toBeInTheDocument();
    expect(screen.getByText('Armaduras compradas')).toBeInTheDocument();
    expect(screen.getByText('Poderes comprados')).toBeInTheDocument();
    expect(screen.getByText('Otros objetos guardados')).toBeInTheDocument();
  });

  test('permite agregar y editar un arma manualmente', async () => {
    render(<Inventory playerName="Jugador" />);
    await waitFor(() => expect(mockFirestore.getDoc).toHaveBeenCalled());

    const addButton = screen.getByRole('button', { name: /^agregar arma$/i });
    await userEvent.click(addButton);

    const nameInput = await screen.findByPlaceholderText(
      'Espada corta, Ballesta de repetición...'
    );
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Espada corta');

    await waitFor(() => expect(mockFirestore.setDoc).toHaveBeenCalled());

    expect(screen.getByDisplayValue('Espada corta')).toBeInTheDocument();
  });

  test('agrega un objeto desde la biblioteca y lo clasifica', async () => {
    render(<Inventory playerName="Jugador" />);
    await waitFor(() => expect(mockFirestore.getDoc).toHaveBeenCalled());

    const generateButton = screen.getByRole('button', { name: /generar arma/i });
    await userEvent.click(generateButton);

    const typeInput = await screen.findByPlaceholderText(
      'Arma a dos manos, Armadura ligera...'
    );
    expect(typeInput).toHaveValue('Weapon');
  });
});
