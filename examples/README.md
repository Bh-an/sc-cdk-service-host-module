# Examples

Reference CDK stacks that demonstrate how to consume the service host constructs. These are validation and integration templates, not the operator entrypoint for the assignment.

## Context

- parent repo: [README.md](../README.md)
- real consumer/operator path: [`sc-ec2-go-service`](https://github.com/Bh-an/sc-ec2-go-service)

## Prerequisites

- Node 22 preferred
- npm
- familiarity with the shared construct props from the parent README

## Stacks

| File | What It Shows |
|------|---------------|
| `basic-stack.ts` | Minimal `PublicServiceHost` usage with inline VPC |
| `shared-infra-stack.ts` | Shared infrastructure consumed by service stacks |
| `consumer-proof-stack.ts` | Both postures together: public service + private service behind ALB |

## Consumer Proof Stack

The proof stack validates the full module surface:

- public path — `PublicServiceHost` with a module-managed EIP
- private path — `PrivateServiceHost` behind a caller-managed ALB

Both use the same runtime model: Nginx on the host, Docker container on a bridge network.

## Using These as Templates

Copy the relevant stack into your consumer repo and adjust:

1. VPC and subnet setup
2. `dockerImage`
3. `serviceName` and tags
4. any overrides from the parent README defaults table
