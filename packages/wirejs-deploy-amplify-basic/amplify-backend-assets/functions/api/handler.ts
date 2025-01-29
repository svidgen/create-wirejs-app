import { env } from 'process';

import { LambdaFunctionURLHandler } from 'aws-lambda';

// import {
// 	S3Client,
// 	ListObjectsCommand,
// 	PutObjectCommand,
// 	GetObjectCommand
// } from '@aws-sdk/client-s3';

import * as api from '../src/api/index.js';

// const s3 = new S3Client()

function getPostData(body: string) {
	
}

export const handler: LambdaFunctionURLHandler = async (event, context) => {
	const calls = JSON.parse(event.body!);
	return {
		statusCode: 200,
		cookies: [],
		body: 'Hello.'
	}
}