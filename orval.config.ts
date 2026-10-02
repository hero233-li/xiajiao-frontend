import { defineConfig } from 'orval';
export default defineConfig({
  xuexizhitu: {
    input: { target: '../docs/openapi.yaml', override: { transformer: './scripts/normalize-openapi.mjs' } },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      mode: 'tags-split',
      client: 'axios-functions',
      baseUrl: '/api/v1',
      clean: true,
      override: { header: () => ['由 Orval 根据 docs/openapi.yaml 自动生成；请勿手动修改。'], mutator: { path: './src/api/http.ts', name: 'apiRequest' } },
    },
  },
});
