import * as monaco from 'monaco-editor';
import { configureMonacoYaml } from 'monaco-yaml';

configureMonacoYaml(monaco, {
  enableSchemaRequest: true,
  hover: true,
  completion: true,
  validate: true,
  format: true,
  schemas: [
    {
      uri: 'http://myserver/schema.json', // Unique URI for the schema
      fileMatch: ['*'], // Apply to all YAML files
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' }
        },
        required: ['name']
      }
    }
  ]
});
