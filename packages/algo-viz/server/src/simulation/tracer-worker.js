// Only trusted catalog files reach this worker. VM is not an untrusted-code sandbox.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const mountedTracers = '/tracers/src';
const localTracers = path.resolve(__dirname, '../../../tracers/src');
const tracersDir = process.env.TRACERS_DIR || (fs.existsSync(mountedTracers) ? mountedTracers : localTracers);
process.on('message', ({ source, capture = {} }) => {
  try {
    const sdk = require(tracersDir);
    sdk.Commander.init();
    const original = sdk.Commander.command;
    sdk.Commander.command = function (...args) {
      if (sdk.Commander.commands.length >= 50000) throw new Error('Trace command limit exceeded.');
      return original.apply(this, args);
    };
    const variables = '{' + Object.keys(capture).map(key => JSON.stringify(key) + ': (() => { try { const value = ' + capture[key] + '; return typeof value === "number" ? value : null; } catch (_) { return null; } })()').join(',') + '}';
    const code = source.split('\n').map((line, index) => line.replace(/(\.\s*delay\s*)\(\s*\)/g, `$1(${index + 1}, ${variables})`)).join('\n');
    const context = vm.createContext({ require(name) { if (name !== 'algorithm-visualizer') throw new Error('Only the visualization SDK is available.'); return sdk; } });
    new vm.Script(code + '\n;require("algorithm-visualizer").Tracer.delay(' + source.split('\n').length + ');').runInContext(context, { timeout: 4000 });
    process.send({ commands: sdk.Commander.commands }, () => process.exit(0));
  } catch (error) {
    process.send({ error: error.message }, () => process.exit(1));
  }
});
