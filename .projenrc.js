const { AwsCdkConstructLibrary } = require('projen/lib/awscdk');
const { NpmAccess } = require('projen/lib/javascript');

const cdkVersion = '2.207.0';
const jsiiVersion = '~5.9.0';
const jsiiPacmakVersion = '^1.127.0';

const project = new AwsCdkConstructLibrary({
  author: 'Bh-an',
  authorAddress: 'bhan.16070@gmail.com',
  cdkVersion,
  cdkVersionPinning: false,
  constructsVersion: '10.0.5',
  constructsVersionPinning: false,
  defaultReleaseBranch: 'main',
  dependabot: false,
  licensed: true,
  mergify: false,
  name: 'cdk-service-host-module',
  npmAccess: NpmAccess.PUBLIC,
  packageName: 'cdk-service-host-module',
  peerDeps: [`aws-cdk-lib@^${cdkVersion}`],
  projenrcTs: false,
  pullRequestTemplate: true,
  release: true,
  releaseEveryCommit: false,
  releaseToNpm: false,
  releaseWorkflow: true,
  repositoryUrl: 'https://github.com/Bh-an/sc-cdk-service-host-module.git',
  publishToGo: {
    gitUserEmail: 'bhan.16070@gmail.com',
    gitUserName: 'sc-infra-bot',
    moduleName: 'github.com/Bh-an/sc-cdk-service-host-module-go',
  },
  devDeps: [
    `aws-cdk-lib@${cdkVersion}`,
    `jsii@${jsiiVersion}`,
    `jsii-pacmak@${jsiiPacmakVersion}`,
  ],
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
      strictPropertyInitialization: false,
    },
  },
});

const commonExclude = [
  'cdk.out',
  'coverage',
  'dist',
  '.DS_Store',
  'yarn-error.log',
];

project.gitignore.exclude(...commonExclude);
project.npmignore.exclude(...commonExclude);
project.synth();
