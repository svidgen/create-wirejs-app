#!/usr/bin/env node

const fs = require('fs');
const process = require('process');
const { exec, execSync } = require('child_process');
const copy = require('recursive-copy');

const [
	nodeBinPath,
	scriptPath,
	projectName,
] = process.argv;

(async () => {
	fs.mkdirSync(projectName);

	console.log("Writing base package files ...");
	await copy(`${__dirname}/template`, `./${projectName}`);

	const packageJson = await fs.readFileSync(`./${projectName}/package.json`);
	fs.writeFileSync(
		`./${projectName}/package.json`,
		packageJson.toString().replace(
			/project-name/, projectName
		)
	);

	console.log("Fetching dependencies ...");
	process.chdir(projectName);
	execSync('npm install');

	console.log(`
Done creating ${projectName}!

To get started:

  cd ${projectName}
  npm start

Happy coding!
`);

})();
