# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-03-27

### Added
- Explicit `retainGeneratedKmsKey` support for callers who want module-managed KMS keys to survive stack destroy

### Changed
- Module-created KMS keys now default to destroy semantics with a 7-day KMS pending-deletion window

## [0.3.3] - 2026-03-27

### Fixed
- Regenerated the published release line from the current `/version`-aware Nginx defaults
- Made the consumer proof example rerun-safe with unique service identities
- Updated the consumer proof example to use two AZs so its internet-facing ALB can deploy successfully

## [0.3.2] - 2026-03-27

### Fixed
- Tightened default Nginx routing to expose only `/api/v1`, `/health`, and `/version`
- Added a direct Nginx health endpoint for bootstrap diagnostics
- Returned `404` for unknown public paths instead of proxying everything

## [0.3.1] - 2026-03-27

### Fixed
- Hardened host bootstrap script with stricter health check retries and Nginx validation
- Updated consumer guidance for public repo consumption model

### Changed
- Operator docs now route AWS testing to the service repo's root `README.md`

## [0.3.0] - 2026-03-15

### Changed
- **Breaking:** renamed `Ec2PublicServiceHost` to `PublicServiceHost` and `Ec2PrivateServiceHost` to `PrivateServiceHost`
- Generalized module identity from EC2-specific to service-host
- Automated releases via GitHub Actions (`release.yml` triggers Go wrapper repo)

### Added
- Cross-repo release orchestration (`RELEASE_REPO_TOKEN` secret)
- Workspace release preparation script (`tools/prepare_workspace_release.py`)

## [0.2.0] - 2026-03-10

### Added
- `PrivateServiceHost` construct for VPC-internal services
- Exposure controls (`ServiceHostExposure`) for caller-managed networking
- Operational hooks (`preBootstrapCommands`, `postBootstrapCommands`)
- Consumer proof stack validating both postures with ALB integration

## [0.1.1] - 2026-03-05

### Fixed
- Corrected npm package identity and wrapper path alignment
- Regenerated Go wrapper checksums

## [0.1.0] - 2026-03-01

### Added
- Initial `PublicServiceHost` construct (EC2, KMS, EBS, IAM, SG, Nginx, Docker bootstrap)
- Shared service contracts (`PlatformServiceProps`, identity resolution, tag helpers)
- JSII-based Go binding generation via Projen
- Consumer CI/CD workflow templates
