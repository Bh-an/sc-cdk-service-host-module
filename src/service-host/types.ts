import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib';
import { ServiceExposureKind } from '../contracts/platform-service';

export interface IngressRule {
  readonly cidr?: string;
  readonly description?: string;
  readonly port?: number;
  readonly sourceSecurityGroup?: ec2.ISecurityGroup;
}

export interface ServiceHostExposure {
  readonly associatePublicIpAddress?: boolean;
  readonly enableElasticIp?: boolean;
  readonly kind?: ServiceExposureKind;
}

export interface ServiceHostOperationalControls {
  readonly additionalManagedPolicies?: iam.IManagedPolicy[];
  readonly additionalRolePolicyStatements?: iam.PolicyStatement[];
  readonly enableDetailedMonitoring?: boolean;
  readonly postBootstrapCommands?: string[];
  readonly preBootstrapCommands?: string[];
  readonly skipSystemPackagesUpdate?: boolean;
}

export interface ServiceHostRuntimeProps {
  readonly allowedIngress?: IngressRule[];
  readonly bridgeCidr?: string;
  readonly bridgeIp?: string;
  readonly bridgeNetworkName?: string;
  readonly dataMountPath?: string;
  readonly dataVolumeDeviceName?: string;
  readonly dataVolumeSizeGiB?: number;
  readonly dockerImage: string;
  readonly exposure?: ServiceHostExposure;
  readonly instanceType?: ec2.InstanceType;
  readonly machineImage?: ec2.IMachineImage;
  readonly nginxMainConfig?: string;
  readonly nginxRoutesConfig?: string;
  readonly operations?: ServiceHostOperationalControls;
  readonly publicPort?: number;
  readonly rootVolumeSizeGiB?: number;
  readonly servicePort?: number;
}
