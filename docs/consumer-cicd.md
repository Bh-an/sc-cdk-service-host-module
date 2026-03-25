# Consumer App CI/CD Integration

This module repo is not the application deployment repo.

A consumer app repo should:

1. build the application image
2. push the image to the target registry
3. choose one of its consumer infra paths:
   - Terraform consumer stack
   - Go CDK consumer stack
4. pass the image reference into that deploy path
5. deploy that consumer stack

For this module family, treat the consumer app as a Go application repo by default.
That means:

- the application source is expected to be Go
- the deploy workflow should validate and build the Go app before packaging the Docker image
- the infrastructure consumer can still be Go CDK or another supported consumer path, but the app itself is assumed to be Go

## Expected Consumer Inputs

The CDK consumer stack should provide:

- `dockerImage`
- an existing `vpc`
- `subnetSelection`
- optional shared `securityGroup`, `role`, `kmsKey`, and `keyPair`
- the appropriate service class:
  - `Ec2DockerService` for module-managed public exposure
  - `PrivateEc2DockerService` for private or caller-managed ingress posture

## Typical Deployment Flow

### 1. Build and push the image

The Go app repo should:

- run Go tests
- optionally build the Go binary as an explicit validation step
- build its Docker image
- push that image to the registry it already uses, such as ECR

The resulting image tag should be injected into the consumer CDK deploy step.

### 2. Consume the module in the app infra stack

The consumer Go CDK stack should treat this package as an infrastructure dependency and pass the pushed image reference into the service construct.

Recommended pattern:

- Go app repo contains its own `infra/terraform/` and `infra/cdk/` directories
- the CDK path imports this module
- the Terraform path imports the shared Terraform modules from the Terraform repo
- each deploy workflow selects the path it is responsible for after image push

For an ALB-backed private service:

- the consumer stack owns the ALB
- the private EC2 service stays in private subnets
- the ALB forwards to the host Nginx listener on the instance
- Nginx continues to proxy to the Dockerized application on the bridge network

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
- Go application consumer repos as the default integration assumption
- CIDR-based ingress rules
- source-security-group ingress rules
- normalized service outputs for endpoint and exposure posture
- consumer proof of both direct public exposure and ALB-backed private exposure

## Reference Example

Use `examples/consumer-proof-stack.ts` for the in-repo consumer proof of:

- one direct public/default service
- one ALB-backed private service
- the expected ALB-to-Nginx-to-container flow

## Reference Workflows

Use these tracked templates as references:

- `.github/workflow-templates/consumer-app-deploy-go-cdk.yml`
- `.github/workflow-templates/consumer-app-deploy-terraform.yml`
