import { aws_ec2 as ec2, aws_iam as iam, aws_kms as kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  NetworkAddressableServiceOutputs,
  PlatformServiceProps,
  ResolvedPlatformServiceIdentity,
} from '../../contracts/platform-service';
import { createEc2DockerHostResources } from './ec2-docker-host';
import { Ec2DockerServiceRuntimeProps } from './types';

export interface PrivateEc2DockerServiceProps extends PlatformServiceProps, Ec2DockerServiceRuntimeProps {}

export class PrivateEc2DockerService extends Construct {
  public readonly dataKey: kms.IKey;
  public readonly dataMountPath: string;
  public readonly dataVolumeDeviceName: string;
  public readonly elasticIp?: ec2.CfnEIP;
  public readonly instance: ec2.Instance;
  public readonly role: iam.IRole;
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly serviceIdentity: ResolvedPlatformServiceIdentity;
  public readonly serviceOutputs: NetworkAddressableServiceOutputs;

  public constructor(scope: Construct, id: string, props: PrivateEc2DockerServiceProps) {
    super(scope, id);

    const publicPort = props.publicPort ?? 80;
    const resources = createEc2DockerHostResources(this, {
      ...props,
      associatePublicIpAddress: false,
      defaultIngressRules: [
        {
          cidr: props.infrastructure.vpc.vpcCidrBlock,
          description: 'VPC internal access',
          port: publicPort,
        },
      ],
      enableElasticIp: false,
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
