# cdk-ec2-service-module

Reusable CDK constructs for the assignment-aligned EC2 service model:

- EC2 host
- Dockerized Go application
- host-level Nginx
- encrypted EBS volumes
- SSM-first access posture

The module family plugs into caller-owned infrastructure. Consumers provide an existing VPC and subnet selection, and may optionally provide shared security groups, IAM roles, KMS keys, and EC2 key pairs.

## Current Modules

- `Ec2DockerService`
  - public/default posture
  - module-managed Elastic IP by default
- `PrivateEc2DockerService`
  - private/internal posture
  - no module-managed public endpoint by default

Both variants share:

- service identity and tag resolution
- normalized service outputs
- ingress rules that support CIDRs or source security groups
- operational controls for IAM policy extension, detailed monitoring, and bootstrap hooks

## Deployability Contract

- Service repo is `ec2-go-service` under the Bh-an namespace.
- The service repo builds and publishes the Docker image to GHCR:
  - `ghcr.io/bh-an/ec2-go-service:<tag>`
- CDK is the primary consumer path for deployment.
- Terraform is an aligned secondary path maintained in lock-step with the CDK shape.
- This module expects a Docker image reference from GHCR to be provided by the consumer stack.
- Current deployability assumption: the GHCR package is public so the EC2 host can pull it during bootstrap without extra registry credentials.

## Consumer CI/CD

This repo publishes the reusable module. The service repo `https://github.com/Bh-an/sc-ec2-go-service` owns:

- Docker image build and GHCR publishing
- environment-specific consumer infra code
- deployment execution

Reference integration material in this repo:

- `docs/consumer-cicd.md`
- `.github/workflow-templates/consumer-app-deploy-go-cdk.yml`
- `.github/workflow-templates/consumer-app-deploy-terraform.yml`
- `examples/consumer-proof-stack.ts`

The consumer proof example validates both postures together:

- a direct public/default service
- a private service behind a caller-managed ALB

For the private path, the ALB forwards to the EC2 host's Nginx listener. Nginx still proxies to the Dockerized application, preserving the assignment-aligned service shape.

In the current split, the service repo can carry both consumer approaches side by side, with CDK as primary:

- `infra/cdk/` for the Go CDK path that consumes this package (primary)
- `infra/terraform/` for the Terraform-module path (aligned secondary)

## Local Verification

Use Node 20 for the supported local path.

```bash
nvm use 20
npm ci
npm run verify
```

## Published Paths

- Source (TypeScript): `https://github.com/Bh-an/sc-cdk-ec2-service-module`
- Go bindings: `github.com/Bh-an/cdk-ec2-service-module-go/cdkec2servicemodule`
- Service image (owned by service repo): `ghcr.io/bh-an/ec2-go-service:<tag>`

## Status

This repo is the active infra/devops evolution path for the original assignment service. The original Terraform/Packer implementation lives separately as the aligned Terraform repo.

Current release line: `0.1.1`
