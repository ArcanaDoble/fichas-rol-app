export interface EnemyDTO {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  challenge: number;
  hp: number;
  tags: string[];
}

export async function getEnemies(): Promise<EnemyDTO[]> {
  // Mocked API call
  return Promise.resolve([
    {
      id: '1',
      name: 'Goblin',
      description: 'Small and green',
      imageUrl: '/goblin.png',
      challenge: 1,
      hp: 7,
      tags: ['easy'],
    },
    {
      id: '2',
      name: 'Orc',
      description: 'Large and tough',
      imageUrl: '/orc.png',
      challenge: 2,
      hp: 15,
      tags: ['medium'],
    },
  ]);
}
