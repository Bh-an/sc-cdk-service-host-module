# Service CI/CD Integration

This module repo is not the application deployment repo.

The service repo is `sc-ec2-go-service` (Bh‑an namespace). It owns:

1. building the application image
2. publishing the image to GHCR at `ghcr.io/bh-an/ec2-go-service:<tag>`
3. choosing a consumer infra path (CDK primary, Terraform secondary)
4. passing the image reference into that deploy path
5. executing the deploy from the service repo

For this module family, treat the service as a Go application by default:

- the application source is Go
- the deploy workflow validates and builds the Go app before packaging the Docker image
- the infrastructure consumer can be Go CDK (primary) or Terraform (secondary)

## Expected Consumer Inputs (CDK)

The CDK consumer stack should provide:

- `dockerImage` — e.g. `ghcr.io/bh-an/ec2-go-service:${GIT_SHA}`
- an existing `vpc`
- `subnetSelection`
- optional shared `securityGroup`, `role`, `kmsKey`, and `keyPair`
- the appropriate service class:
  - `Ec2DockerService` for module‑managed public exposure
  - `PrivateEc2DockerService` for private or caller‑managed ingress posture

## Typical Deployment Flow

### 1. Build and publish the image (in sc-ec2-go-service)

From the service repo:

- run Go tests
- optionally build the Go binary as a validation step
- build the Docker image
- push to GHCR: `ghcr.io/bh-an/ec2-go-service:${GIT_SHA}` (or your chosen tag)

### 2. Consume the module in the service infra stack

In `sc-ec2-go-service/infra/cdk` (primary):

- import this package via the generated Go bindings
- pass the GHCR image reference into the service construct’s `dockerImage`

In `sc-ec2-go-service/infra/terraform` (secondary):

- consume the aligned Terraform modules from `https://github.com/Bh-an/sc-tf-service-host-module`
- pass the same GHCR image reference to the root/variables as required
- keep the GHCR package public, or add registry credentials outside the current `v0.2.0` contract before switching to private images

For an ALB‑backed private service:

- the service stack owns the ALB
- the private EC2 service stays in private subnets
- the ALB forwards to the host Nginx listener on the instance
- Nginx proxies to the Dockerized application on the bridge network

### 3. Deploy the service stack

Run the deploy workflow from the service repo, not from this module repo.

That workflow typically:

- configures AWS credentials
- builds and publishes the image to GHCR
- installs infra dependencies
- runs `cdk deploy` (primary) or `terraform apply` (secondary) with the new image reference

## Current Integration Contract

This repo currently supports:

- public/default EC2 service deployment
- private/internal EC2 service deployment
- Go application service repo as the default assumption
- GHCR image publishing owned by the service repo
- CIDR‑based and source‑security‑group ingress rules
- normalized service outputs for endpoint and exposure posture
- consumer proof of both direct public exposure and ALB‑backed private exposure

## Reference Example & Workflows

Use `examples/consumer-proof-stack.ts` for the in‑repo consumer proof of:

- one direct public/default service
- one ALB‑backed private service
- the expected ALB→Nginx→container flow

Use these tracked templates as references:

- `.github/workflow-templates/consumer-app-deploy-go-cdk.yml`
- `.github/workflow-templates/consumer-app-deploy-terraform.yml`
