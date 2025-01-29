import {
    defineFunction
} from '@aws-amplify/backend';

const api = defineFunction({
  entry: './handler.ts',
});

export { api };