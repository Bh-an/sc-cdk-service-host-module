# Consumer App CI/CD Integration

This module repo is not the application deployment repo.

A consumer app repo should:

1. build the application image
2. push the image to the target registry
3. pass the image reference into a CDK stack that consumes `cdk-ec2-service-module`
4. deploy that consumer stack

## Expected Consumer Inputs

The consumer stack should provide:

- `dockerImage`
- an existing `vpc`
- `subnetSelection`
- optional shared `securityGroup`, `role`, `kmsKey`, and `keyPair`
- the appropriate service class:
  - `Ec2DockerService` for module-managed public exposure
  - `PrivateEc2DockerService` for private or caller-managed ingress posture

## Typical Deployment Flow

### 1. Build and push the image

The app repo should build its Docker image and push it to the registry it already uses, such as ECR.

The resulting image tag should be injected into the consumer CDK deploy step.

### 2. Consume the module in the app infra stack

The consumer CDK stack should treat this package as an infrastructure dependency and pass the pushed image reference into the service construct.

Recommended pattern:

- app repo contains its own infra stack
- infra stack imports this module
- workflow deploys the infra stack after image push

### 3. Deploy the consumer stack

The deploy workflow should run from the app repo, not from this module repo.

That workflow should:

- configure AWS credentials
- build and push the image
- install infra dependencies
- run `cdk deploy` with the new image reference

## Current Integration Contract

This repo currently supports:

- public/default EC2 service deployment
- private/internal EC2 service deployment
- CIDR-based ingress rules
- source-security-group ingress rules
- normalized service outputs for endpoint and exposure posture

## Reference Workflow

Use `.github/workflow-templates/consumer-app-deploy.yml` in this repo as a reference for the consumer-side workflow shape.
