import { aws_ec2 as ec2, aws_iam as iam, aws_kms as kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  NetworkAddressableServiceOutputs,
  PlatformServiceProps,
  ResolvedPlatformServiceIdentity,
} from '../contracts/platform-service';
import {
  createServiceHostResources,
  resolveServiceHostExposure,
} from './service-host-core';
import { ServiceHostRuntimeProps } from './types';

export interface PrivateServiceHostProps extends PlatformServiceProps, ServiceHostRuntimeProps {}

export class PrivateServiceHost extends Construct {
  public readonly dataKey: kms.IKey;
  public readonly dataMountPath: string;
  public readonly dataVolumeDeviceName: string;
  public readonly elasticIp?: ec2.CfnEIP;
  public readonly instance: ec2.Instance;
  public readonly role: iam.IRole;
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly serviceIdentity: ResolvedPlatformServiceIdentity;
  public readonly serviceOutputs: NetworkAddressableServiceOutputs;

  public constructor(scope: Construct, id: string, props: PrivateServiceHostProps) {
    super(scope, id);

    const publicPort = props.publicPort ?? 80;
    const exposure = resolveServiceHostExposure({
      defaultExposureKind: 'private',
      legacyAssociatePublicIpAddress: false,
      legacyDefaultIngressRules: [
        {
          cidr: props.infrastructure.vpc.vpcCidrBlock,
          description: 'VPC internal access',
          port: publicPort,
        },
      ],
      legacyEnableElasticIp: false,
      privateVpcCidr: props.infrastructure.vpc.vpcCidrBlock,
      publicPort,
      requestedExposure: props.exposure,
    });

    const resources = createServiceHostResources(this, {
      ...props,
      ...exposure,
    });

    this.dataKey = resources.dataKey;
    this.dataMountPath = resources.dataMountPath;
    this.dataVolumeDeviceName = resources.dataVolumeDeviceName;
    this.elasticIp = resources.elasticIp;
    this.instance = resources.instance;
    this.role = resources.role;
    this.securityGroup = resources.securityGroup;
    this.serviceIdentity = resources.serviceIdentity;
    this.serviceOutputs = resources.serviceOutputs;
  }
}
