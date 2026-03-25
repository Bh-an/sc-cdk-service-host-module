import {
  Tags,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_kms as kms,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  NetworkAddressableServiceOutputs,
  PlatformServiceProps,
  ResolvedPlatformServiceIdentity,
  ServiceInfrastructureProps,
  applyTags,
  buildResourceName,
  resolveServiceIdentity,
} from '../../contracts/platform-service';
import {
  DEFAULT_NGINX_CONF,
  buildDefaultAppRoutesConfig,
} from './default-nginx-config';
import { Ec2DockerServiceRuntimeProps, IngressRule } from './types';

interface Ec2DockerHostDefaults {
  readonly associatePublicIpAddress: boolean;
  readonly defaultIngressRules: IngressRule[];
  readonly enableElasticIp: boolean;
}

export interface Ec2DockerHostProps extends
  PlatformServiceProps,
  Ec2DockerServiceRuntimeProps,
  Ec2DockerHostDefaults {}

export interface Ec2DockerHostResources {
  readonly dataKey: kms.IKey;
  readonly dataMountPath: string;
  readonly dataVolumeDeviceName: string;
  readonly elasticIp?: ec2.CfnEIP;
  readonly instance: ec2.Instance;
  readonly role: iam.IRole;
  readonly securityGroup: ec2.ISecurityGroup;
  readonly serviceIdentity: ResolvedPlatformServiceIdentity;
  readonly serviceOutputs: NetworkAddressableServiceOutputs;
}

export function createEc2DockerHostResources(
  scope: Construct,
  props: Ec2DockerHostProps,
): Ec2DockerHostResources {
  const servicePort = props.servicePort ?? 8081;
  const publicPort = props.publicPort ?? 80;
  const bridgeNetworkName = props.bridgeNetworkName ?? 'ec2-net';
  const bridgeCidr = props.bridgeCidr ?? '172.30.0.0/24';
  const bridgeIp = props.bridgeIp ?? '172.30.0.10';
  const dataMountPath = props.dataMountPath ?? '/data';
  const dataVolumeDeviceName = props.dataVolumeDeviceName ?? '/dev/xvdf';
  const nginxMainConfig = props.nginxMainConfig ?? DEFAULT_NGINX_CONF;
  const nginxRoutesConfig =
    props.nginxRoutesConfig ??
    buildDefaultAppRoutesConfig(bridgeIp, servicePort, publicPort);
  const serviceIdentity = resolveServiceIdentity(props);
  const tags = serviceIdentity.tags;

  const role = resolveRole(scope, props.infrastructure, serviceIdentity);
  const dataKey = resolveKey(scope, props.infrastructure, serviceIdentity);
  const securityGroup = resolveSecurityGroup(scope, props.infrastructure, serviceIdentity);

  for (const rule of props.allowedIngress ?? props.defaultIngressRules) {
    securityGroup.addIngressRule(
      ec2.Peer.ipv4(rule.cidr),
      ec2.Port.tcp(rule.port ?? publicPort),
      rule.description,
    );
  }

  const machineImage =
    props.machineImage ??
    ec2.MachineImage.latestAmazonLinux2023({
      cpuType: ec2.AmazonLinuxCpuType.X86_64,
    });

  const instance = new ec2.Instance(scope, 'Instance', {
    associatePublicIpAddress: props.associatePublicIpAddress,
    blockDevices: [
      {
        deviceName: '/dev/xvda',
        volume: ec2.BlockDeviceVolume.ebs(props.rootVolumeSizeGiB ?? 20, {
          deleteOnTermination: true,
          encrypted: true,
          kmsKey: dataKey,
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      },
      {
        deviceName: dataVolumeDeviceName,
        volume: ec2.BlockDeviceVolume.ebs(props.dataVolumeSizeGiB ?? 10, {
          deleteOnTermination: true,
          encrypted: true,
          kmsKey: dataKey,
          volumeType: ec2.EbsDeviceVolumeType.GP3,
        }),
      },
    ],
    instanceType: props.instanceType ?? new ec2.InstanceType('t3.micro'),
    keyPair: props.infrastructure.keyPair,
    machineImage,
    requireImdsv2: true,
    role,
    securityGroup,
    userData: ec2.UserData.custom(
      renderUserData({
        bridgeCidr,
        bridgeIp,
        bridgeNetworkName,
        dataMountPath,
        dockerImage: props.dockerImage,
        nginxMainConfig,
        nginxRoutesConfig,
        publicPort,
        serviceName: serviceIdentity.resourcePrefix,
        servicePort,
      }),
    ),
    vpc: props.infrastructure.vpc,
    vpcSubnets: props.infrastructure.subnetSelection,
  });

  Tags.of(instance).add('Name', buildResourceName(serviceIdentity, 'host'));
  applyTags(instance, tags);

  let elasticIp: ec2.CfnEIP | undefined;

  if (props.enableElasticIp) {
    elasticIp = new ec2.CfnEIP(scope, 'ElasticIp', {
      domain: 'vpc',
      tags: [
        {
          key: 'Name',
          value: buildResourceName(serviceIdentity, 'eip'),
        },
        ...Object.entries(tags).map(([key, value]) => ({ key, value })),
      ],
    });

    new ec2.CfnEIPAssociation(scope, 'ElasticIpAssociation', {
      allocationId: elasticIp.attrAllocationId,
      instanceId: instance.instanceId,
    });
  }

  return {
    dataKey,
    dataMountPath,
    dataVolumeDeviceName,
    elasticIp,
    instance,
    role,
    securityGroup,
    serviceIdentity,
    serviceOutputs: {
      displayName: serviceIdentity.displayName,
      endpoint: elasticIp?.ref,
      hasPublicEndpoint: elasticIp !== undefined,
      listenerPort: publicPort,
      securityGroup,
      serviceName: serviceIdentity.serviceName,
      tags: serviceIdentity.tags,
    },
  };
}

function resolveKey(
  scope: Construct,
  infrastructure: ServiceInfrastructureProps,
  serviceIdentity: ResolvedPlatformServiceIdentity,
): kms.IKey {
  if (infrastructure.kmsKey) {
    return infrastructure.kmsKey;
  }

  const key = new kms.Key(scope, 'DataKey', {
    description: `KMS key for ${serviceIdentity.resourcePrefix} EBS volumes`,
    enableKeyRotation: true,
  });
  Tags.of(key).add('Name', buildResourceName(serviceIdentity, 'ebs-key'));
  applyTags(key, serviceIdentity.tags);
  return key;
}

function resolveRole(
  scope: Construct,
  infrastructure: ServiceInfrastructureProps,
  serviceIdentity: ResolvedPlatformServiceIdentity,
): iam.IRole {
  if (infrastructure.role) {
    return infrastructure.role;
  }

  const role = new iam.Role(scope, 'InstanceRole', {
    assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
    ],
  });
  Tags.of(role).add('Name', buildResourceName(serviceIdentity, 'role'));
  applyTags(role, serviceIdentity.tags);
  return role;
}

function resolveSecurityGroup(
  scope: Construct,
  infrastructure: ServiceInfrastructureProps,
  serviceIdentity: ResolvedPlatformServiceIdentity,
): ec2.ISecurityGroup {
  if (infrastructure.securityGroup) {
    return infrastructure.securityGroup;
  }

  const securityGroup = new ec2.SecurityGroup(scope, 'SecurityGroup', {
    allowAllOutbound: true,
    description: `Security group for ${serviceIdentity.resourcePrefix}`,
    vpc: infrastructure.vpc,
  });
  Tags.of(securityGroup).add('Name', buildResourceName(serviceIdentity, 'sg'));
  applyTags(securityGroup, serviceIdentity.tags);
  return securityGroup;
}

interface RenderUserDataInput {
  readonly bridgeCidr: string;
  readonly bridgeIp: string;
  readonly bridgeNetworkName: string;
  readonly dataMountPath: string;
  readonly dockerImage: string;
  readonly nginxMainConfig: string;
  readonly nginxRoutesConfig: string;
  readonly publicPort: number;
  readonly serviceName: string;
  readonly servicePort: number;
}

function renderUserData(props: RenderUserDataInput): string {
  return [
    '#!/bin/bash',
    'set -euo pipefail',
    'exec > >(tee /var/log/user-data.log) 2>&1',
    '',
    'echo "Starting bootstrap..."',
    'dnf update -y',
    'dnf install -y docker nginx curl',
    'systemctl enable docker',
    'systemctl enable nginx',
    'systemctl start docker',
    'systemctl start nginx',
    '',
    'ROOT_SOURCE="$(findmnt -n -o SOURCE /)"',
    'ROOT_DISK="$(lsblk -no PKNAME "${ROOT_SOURCE}" 2>/dev/null || true)"',
    'DATA_DISK="$(lsblk -dpno NAME,TYPE | awk -v root="/dev/${ROOT_DISK}" \'$2 == "disk" && $1 != root { print $1; exit }\')"',
    '',
    'if [ -n "${DATA_DISK}" ]; then',
    '  if ! blkid "${DATA_DISK}" >/dev/null 2>&1; then',
    '    mkfs.ext4 "${DATA_DISK}"',
    '  fi',
    `  mkdir -p ${props.dataMountPath}`,
    `  if ! mountpoint -q ${props.dataMountPath}; then`,
    `    mount "\${DATA_DISK}" ${props.dataMountPath}`,
    '  fi',
    `  if ! grep -q "\${DATA_DISK} ${props.dataMountPath} ext4 defaults,nofail 0 2" /etc/fstab; then`,
    `    echo "\${DATA_DISK} ${props.dataMountPath} ext4 defaults,nofail 0 2" >> /etc/fstab`,
    '  fi',
    'fi',
    '',
    'until docker info >/dev/null 2>&1; do',
    '  echo "Waiting for Docker..."',
    '  sleep 2',
    'done',
    '',
    'mkdir -p /etc/nginx/conf.d',
    "cat <<'NGINX_MAIN' >/etc/nginx/nginx.conf",
    props.nginxMainConfig,
    'NGINX_MAIN',
    '',
    "cat <<'NGINX_ROUTES' >/etc/nginx/conf.d/approutes.conf",
    props.nginxRoutesConfig,
    'NGINX_ROUTES',
    '',
    `docker network inspect ${props.bridgeNetworkName} >/dev/null 2>&1 || \\`,
    '  docker network create \\',
    '    --driver bridge \\',
    `    --subnet ${props.bridgeCidr} \\`,
    `    ${props.bridgeNetworkName}`,
    '',
    `docker rm -f ${props.serviceName} >/dev/null 2>&1 || true`,
    `docker pull ${props.dockerImage}`,
    'docker run -d \\',
    `  --name ${props.serviceName} \\`,
    '  --restart unless-stopped \\',
    `  --network ${props.bridgeNetworkName} \\`,
    `  --ip ${props.bridgeIp} \\`,
    `  -v ${props.dataMountPath}:${props.dataMountPath} \\`,
    `  ${props.dockerImage}`,
    '',
    'MAX_RETRIES=30',
    'RETRY=0',
    `until curl -sf http://${props.bridgeIp}:${props.servicePort}/health >/dev/null 2>&1; do`,
    '  RETRY=$((RETRY + 1))',
    '  if [ "${RETRY}" -ge "${MAX_RETRIES}" ]; then',
    '    echo "ERROR: application failed to become healthy"',
    '    exit 1',
    '  fi',
    '  echo "Waiting for application health..."',
    '  sleep 5',
    'done',
    '',
    'nginx -t',
    'systemctl restart nginx',
    `curl -sf http://localhost:${props.publicPort}/health >/dev/null`,
    'echo "Bootstrap complete"',
  ].join('\n');
}
