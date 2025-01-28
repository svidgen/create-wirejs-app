import {
  defineBackend,
  defineStorage,
  defineFunction
} from '@aws-amplify/backend';
import { RemovalPolicy } from "aws-cdk-lib";
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';

const api = defineFunction({
  entry: '../api-lambda.ts',
})

const storage = defineStorage({
  name: 'app-data',
  access: allow => allow.resource(api)
});

const backend = defineBackend({
  api,
  storage,
});

backend.api.addEnvironment(
  'BUCKET', backend.storage.resources.bucket.bucketName
);
const apiUrl = backend.api.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});

backend.storage.resources.bucket.applyRemovalPolicy(RemovalPolicy.RETAIN);

backend.addOutput({
  custom: {
    api: apiUrl.url
  }
});