# `cdk-ec2-service-module`

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

## Consumer CI/CD

This repo publishes the reusable module. A consumer app repo is expected to be a Go application repo and should own:

- Docker image build and push
- environment-specific consumer infra code
- deployment execution

Reference integration material lives in:

- `docs/consumer-cicd.md`
- `.github/workflow-templates/consumer-app-deploy-go-cdk.yml`
- `.github/workflow-templates/consumer-app-deploy-terraform.yml`
- `examples/consumer-proof-stack.ts`

The consumer proof example now validates both postures together:

- a direct public/default service
- a private service behind a caller-managed ALB

For the private path, the ALB forwards to the EC2 host’s Nginx listener. Nginx still proxies to the Dockerized application, preserving the assignment-aligned service shape.

In the current workspace split, the service repo can carry both consumer approaches side by side:

- `infra/terraform/` for the Terraform-module path
- `infra/cdk/` for the Go CDK path that consumes this package

## Local Verification

Use Node 20 for the supported local path.

```bash
nvm use 20
npm ci
npm run verify
```

## Status

This repo is the active infra/devops evolution path for the original assignment service. The original Terraform/Packer implementation lives separately as the behavioral reference baseline.

Current release line: `0.1.0`
