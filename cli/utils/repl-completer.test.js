const replCmd = require('../commands/repl');

describe('REPL completer suggestions', () => {
  test('set -> keys include intent and tolerance', () => {
    const completer = replCmd.__getCompleter();
    const [list] = completer('set ');
    expect(list).toEqual(expect.arrayContaining(['format','source','tz','intent','tolerance']));
  });

  test('set intent -> on/off', () => {
    const completer = replCmd.__getCompleter();
    const [list] = completer('set intent ');
    expect(list).toEqual(expect.arrayContaining(['on','off']));
  });

  test('watch m -> bodies suggestions', () => {
    const completer = replCmd.__getCompleter();
    const [list] = completer('watch m');
    expect(list).toEqual(expect.arrayContaining(['mercury','mars','moon']));
  });

  test('compare -> bodies suggestions', () => {
    const completer = replCmd.__getCompleter();
    const [list] = completer('compare ');
    expect(list).toEqual(expect.arrayContaining(['sun','moon','mercury','venus','mars','jupiter','saturn']));
  });
});