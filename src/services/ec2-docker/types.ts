import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface IngressRule {
  readonly cidr: string;
  readonly description?: string;
  readonly port?: number;
}

export interface Ec2DockerServiceRuntimeProps {
  readonly allowedIngress?: IngressRule[];
  readonly bridgeCidr?: string;
  readonly bridgeIp?: string;
  readonly bridgeNetworkName?: string;
  readonly dataMountPath?: string;
  readonly dataVolumeDeviceName?: string;
  readonly dataVolumeSizeGiB?: number;
  readonly dockerImage: string;
  readonly instanceType?: ec2.InstanceType;
  readonly machineImage?: ec2.IMachineImage;
  readonly nginxMainConfig?: string;
  readonly nginxRoutesConfig?: string;
  readonly publicPort?: number;
  readonly rootVolumeSizeGiB?: number;
  readonly servicePort?: number;
}
