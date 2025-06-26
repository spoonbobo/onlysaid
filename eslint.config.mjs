import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Only check files in the src directory, but exclude src/app
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/node_modules/**', '**/.next/**']
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    'rules': {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'indent': 'off'
    }
  }
];

export default eslintConfig;
