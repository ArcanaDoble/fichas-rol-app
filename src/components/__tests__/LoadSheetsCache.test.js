function createLoader() {
  const loaded = new Set();
  return async function loadSheets(tokens, fetch) {
    const promises = [];
    tokens.forEach(t => {
      if (!t.tokenSheetId || loaded.has(t.tokenSheetId)) return;
      loaded.add(t.tokenSheetId);
      promises.push(fetch(t.tokenSheetId));
    });
    await Promise.all(promises);
  };
}

test('sheets are fetched only once per ID', async () => {
  const fetch = jest.fn(() => Promise.resolve());
  const loadSheets = createLoader();

  await loadSheets([{ tokenSheetId: 's1' }], fetch);
  expect(fetch).toHaveBeenCalledTimes(1);

  await loadSheets([{ tokenSheetId: 's1', x: 1 }], fetch);
  expect(fetch).toHaveBeenCalledTimes(1);

  await loadSheets([{ tokenSheetId: 's1' }, { tokenSheetId: 's1' }], fetch);
  expect(fetch).toHaveBeenCalledTimes(1);

  await loadSheets([{ tokenSheetId: 's1' }, { tokenSheetId: 's2' }], fetch);
  expect(fetch).toHaveBeenCalledTimes(2);
});
