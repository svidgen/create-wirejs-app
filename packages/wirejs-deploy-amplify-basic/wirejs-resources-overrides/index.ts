import { env } from 'process';

import {
	S3Client,
	ListObjectsCommand,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand
} from '@aws-sdk/client-s3';

import {
	overrides,
	Resource,
} from 'wirejs-resources';

export {
	AuthenticationService,
	withContext,
	requiresContext,
	Context,
	CookieJar,
	Resource,
	overrides,
} from 'wirejs-resources';

const Bucket = env['BUCKET'];
const s3 = new S3Client();

export class FileService extends Resource {

	constructor(scope: Resource | string, id: string) {
		super(scope, id);
		addResource('FileService', { absoluteId: this.absoluteId });
	}

	async read(filename: string, encoding: BufferEncoding = 'utf8') {
		const Key = `${this.absoluteId}/${filename}`;
		const command = new GetObjectCommand({ Bucket, Key });
		const result = await s3.send(command);
		return result.Body!.transformToString(encoding);
	}

	async write(filename: string, data: string, { onlyIfNotExists = false} = {}) {
		const Key = `${this.absoluteId}/${filename}`;
		const Body = data;

		const commandDetails: ConstructorParameters<typeof PutObjectCommand>[0] = {
			Bucket, Key, Body
		};
		if (onlyIfNotExists) {
			commandDetails['IfNoneMatch'] = '*';
		}
		const command = new PutObjectCommand(commandDetails);
		await s3.send(command);
	}

	async delete(filename: string) {
		const Key = `${this.absoluteId}/${filename}`;
		const command = new DeleteObjectCommand({
			Bucket,
			Key
		});
		await s3.send(command);
	}

	async * list({ prefix = '' } = {}) {
		const Prefix = `${this.absoluteId}/${prefix}`;
		let Marker: string | undefined = undefined;

		while (true) {
			const command: ListObjectsCommand = new ListObjectsCommand({
				Bucket,
				Prefix,
				MaxKeys: 1000,
				Marker
			});

			const result = await s3.send(command);
			Marker = result.Marker;
			
			for (const o of result.Contents || []) {
				yield o.Key;
			}

			if (!Marker) break;
		}
	}

	isAlreadyExistsError(error: any) {
		// https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
		return error?.$metadata?.httpStatusCode === 412;
	}
}

// expose resources to other resources that might depend on it.
overrides.FileService = FileService as any;

(globalThis as any).wirejsResources = [];

function addResource(type: string, options: any) {
	(globalThis as any).wirejsResources.push({
		type,
		options
	});
}
