import {
  defineBackend,
} from '@aws-amplify/backend';
import { RemovalPolicy } from "aws-cdk-lib";
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { api } from './functions/api/resource';

const backend = defineBackend({
  api,
});

const bucket = new Bucket(backend.stack, 'data', {
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  removalPolicy: RemovalPolicy.RETAIN,
});
bucket.grantReadWrite(backend.api.resources.lambda);

backend.api.addEnvironment(
  'BUCKET', bucket.bucketName
);

const apiUrl = backend.api.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});

backend.addOutput({
  custom: {
    api: apiUrl.url
  }
});
