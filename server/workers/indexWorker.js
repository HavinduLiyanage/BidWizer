const path = require('path')
const Module = require('module')

const originalLoad = Module._load
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {}
  }
  return originalLoad(request, parent, isMain)
}

require('tsconfig-paths/register')

require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.worker.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
})

require('./indexWorker.ts')
