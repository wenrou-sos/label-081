import { defineConfig } from '@pandacss/dev'
import parkPreset from '@park-ui/panda-preset'

export default defineConfig({
  preflight: true,
  presets: [parkPreset],
  include: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'react'
})
