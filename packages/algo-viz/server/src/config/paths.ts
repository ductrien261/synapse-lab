import path from 'path';
import fs from 'fs';

export const rootDir = path.resolve(__dirname, '..', '..');
export const publicDir = path.resolve(rootDir, 'public');

const mountedAlgorithmsDir = '/algorithms';
const localAlgorithmsDir = path.resolve(rootDir, '..', 'algorithms');
const fallbackAlgorithmsDir = path.resolve(publicDir, 'algorithms');

export const algorithmsDir = process.env.ALGORITHMS_DIR
  || (fs.existsSync(mountedAlgorithmsDir) && fs.readdirSync(mountedAlgorithmsDir).length > 0 ? mountedAlgorithmsDir
  : fs.existsSync(localAlgorithmsDir) ? localAlgorithmsDir
  : fallbackAlgorithmsDir);
export const codesDir = path.resolve(publicDir, 'codes');
export const visualizationsDir = path.resolve(publicDir, 'visualizations');
export const frontendDir = path.resolve(publicDir, 'frontend');
export const frontendBuildDir = path.resolve(frontendDir, 'build');
export const frontendBuiltDir = path.resolve(publicDir, 'frontend-built');
