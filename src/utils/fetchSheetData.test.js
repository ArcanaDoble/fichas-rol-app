import fetchSheetData from './fetchSheetData';

afterEach(() => {
  jest.clearAllMocks();
});

test('parses google sheet response', async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const sample = 'google.visualization.Query.setResponse({"table":{"cols":[{"label":"Name"},{"label":"Age"}],"rows":[{"c":[{"v":"Alice"},{"v":30}]}]}})';
  global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve(sample) }));

  const data = await fetchSheetData('123', 'Sheet1');
  expect(global.fetch).toHaveBeenCalledWith('https://docs.google.com/spreadsheets/d/123/gviz/tq?sheet=Sheet1&tqx=out:json');
  expect(data).toEqual([{ Name: 'Alice', Age: 30 }]);
  process.env.NODE_ENV = originalEnv;
});

test('returns empty array in test environment', async () => {
  process.env.NODE_ENV = 'test';
  const data = await fetchSheetData('123', 'Sheet1');
  expect(data).toEqual([]);
});
