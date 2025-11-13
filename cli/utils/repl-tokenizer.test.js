const replCmd = require('../commands/repl');

describe('REPL tokenizer and control parsing', () => {
  test('tokenizer keeps quoted substrings together', () => {
    const r = replCmd.__createForTest();
    const line = 'control location 37.9838,23.7275 --timezone "Europe/Athens" --name "Athens, Greece"';
    const tokens = r._tokenize(line);
    expect(tokens).toEqual([
      'control',
      'location',
      '37.9838,23.7275',
      '--timezone',
      'Europe/Athens',
      '--name',
      'Athens, Greece'
    ]);
  });

  test('_buildControlOptionsFromTokens parses quoted flags correctly', () => {
    const r = replCmd.__createForTest();
    const args = r._buildControlOptionsFromTokens([
      'location',
      '37.9838,23.7275',
      '--timezone',
      'Europe/Athens',
      '--name',
      'Athens, Greece'
    ]);
    expect(args).toEqual(expect.objectContaining({
      action: 'location',
      value: '37.9838,23.7275',
      timezone: 'Europe/Athens',
      name: 'Athens, Greece'
    }));
  });
});
