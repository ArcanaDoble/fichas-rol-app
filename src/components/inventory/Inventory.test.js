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
    <button onClick={() => onGenerate('weapon')} type="button">
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

    expect(screen.getByText('Armas')).toBeInTheDocument();
    expect(screen.getByText('Armaduras')).toBeInTheDocument();
    expect(screen.getByText('Habilidades')).toBeInTheDocument();
    expect(screen.getByText('Objetos adicionales')).toBeInTheDocument();
  });

  test('permite agregar y equipar un arma manualmente', async () => {
    render(<Inventory playerName="Jugador" />);
    await waitFor(() => expect(mockFirestore.getDoc).toHaveBeenCalled());

    const [addButton] = screen.getAllByRole('button', { name: /^agregar arma$/i });
    await userEvent.click(addButton);

    const [nameInput] = await screen.findAllByPlaceholderText('Nombre del objeto');
    await userEvent.type(nameInput, 'Espada corta');

    const statusButton = screen.getByRole('button', { name: /disponible/i });
    await userEvent.click(statusButton);

    expect(screen.getByRole('button', { name: /equipado/i })).toBeInTheDocument();
    expect(mockFirestore.setDoc).toHaveBeenCalled();
  });

  test('agrega un objeto desde la biblioteca y lo clasifica', async () => {
    render(<Inventory playerName="Jugador" />);
    await waitFor(() => expect(mockFirestore.getDoc).toHaveBeenCalled());

    const generateButton = screen.getByRole('button', { name: /generar arma/i });
    await userEvent.click(generateButton);

    const generatedInput = await screen.findByDisplayValue('Weapon');
    expect(generatedInput).toBeInTheDocument();
  });
});
