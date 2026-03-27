# Examples

Reference CDK stacks that demonstrate how to consume the service host constructs. These are not deployed directly — they exist for validation and as integration templates.

## Stacks

| File | What It Shows |
|------|---------------|
| `basic-stack.ts` | Minimal `PublicServiceHost` usage with inline VPC |
| `shared-infra-stack.ts` | Shared infrastructure (VPC, subnets) consumed by service stacks |
| `consumer-proof-stack.ts` | Both postures together: public service + private service behind ALB |

## Consumer Proof Stack

The proof stack validates the full module surface:

- **Public path** — `PublicServiceHost` with a module-managed EIP. Ingress on port 80 from `0.0.0.0/0`.
- **Private path** — `PrivateServiceHost` behind a caller-managed ALB. The ALB forwards to the host's Nginx listener. Nginx proxies to the container. No public IP on the instance itself.

This demonstrates that both postures produce working deployments with the same runtime model (Nginx on host, Docker container on bridge network).

## Using These as Templates

Copy the relevant stack into your consumer repo and adjust:

1. Replace the VPC and subnet setup with your existing infrastructure
2. Set `dockerImage` to your GHCR image reference
3. Adjust `serviceName` and tags to match your service identity
4. Override any defaults from the [configured defaults table](../README.md#configured-defaults) as needed
