#!/usr/bin/env node

const copy = require('recursive-copy');

(async () => {
	console.log("Writing Amplify configuration.");
	await copy(`${__dirname}/assets/amplify.yml`, `./amplify.yml`);

	console.log(`
Amplify configuration written. Your next steps:

1. Commit the new configuration file:

  git add .
  git commit -m "added amplify deployment config"
  git push

2. Visit hhttps://us-east-2.console.aws.amazon.com/amplify/create/add-repo
3. Add your repository info and continue the setup.

After setup, Amplify will act as your CI/CD platform and deploy your app.

Happy building!
`);

})();
