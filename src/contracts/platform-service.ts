import { IConstruct } from 'constructs';
import { Tags, aws_ec2 as ec2, aws_iam as iam, aws_kms as kms } from 'aws-cdk-lib';

export type ServiceExposureKind = 'module-public' | 'private' | 'caller-managed';

export interface PlatformServiceIdentity {
  readonly displayName?: string;
  readonly namePrefix?: string;
}

export interface ServiceInfrastructureProps {
  readonly keyPair?: ec2.IKeyPair;
  readonly kmsKey?: kms.IKey;
  readonly retainGeneratedKmsKey?: boolean;
  readonly role?: iam.IRole;
  readonly securityGroup?: ec2.ISecurityGroup;
  readonly sharedTags?: Record<string, string>;
  readonly subnetSelection: ec2.SubnetSelection;
  readonly vpc: ec2.IVpc;
}

export interface PlatformServiceProps {
  readonly additionalTags?: Record<string, string>;
  readonly identity?: PlatformServiceIdentity;
  readonly infrastructure: ServiceInfrastructureProps;
  readonly serviceName: string;
}

export interface ResolvedPlatformServiceIdentity {
  readonly displayName: string;
  readonly resourcePrefix: string;
  readonly serviceName: string;
  readonly tags: Record<string, string>;
}

export interface PlatformServiceOutputs {
  readonly displayName: string;
  readonly securityGroup: ec2.ISecurityGroup;
  readonly serviceName: string;
  readonly tags: Record<string, string>;
}

export interface NetworkAddressableServiceOutputs extends PlatformServiceOutputs {
  readonly endpoint?: string;
  readonly exposureKind: ServiceExposureKind;
  readonly hasPublicEndpoint: boolean;
  readonly listenerPort: number;
}

export function mergeTags(
  infrastructure: ServiceInfrastructureProps,
  additionalTags?: Record<string, string>,
): Record<string, string> {
  return {
    ...(infrastructure.sharedTags ?? {}),
    ...(additionalTags ?? {}),
  };
}

export function applyTags(
  resource: IConstruct,
  tags: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(tags)) {
    Tags.of(resource).add(key, value);
  }
}

export function resolveServiceIdentity(
  props: PlatformServiceProps,
): ResolvedPlatformServiceIdentity {
  const tags = mergeTags(props.infrastructure, props.additionalTags);
  const resourcePrefix = [
    props.identity?.namePrefix,
    props.serviceName,
  ].filter((part): part is string => Boolean(part)).join('-');

  return {
    displayName: props.identity?.displayName ?? props.serviceName,
    resourcePrefix,
    serviceName: props.serviceName,
    tags,
  };
}

export function buildResourceName(
  identity: ResolvedPlatformServiceIdentity,
  suffix: string,
): string {
  return `${identity.resourcePrefix}-${suffix}`;
}
