import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_iam as iam, aws_kms as kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2DockerService, PrivateEc2DockerService } from '../src';

export class SharedInfrastructureStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'ExistingInfraVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.20.0.0/16'),
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const sharedRole = new iam.Role(this, 'SharedServiceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });
    const sharedSecurityGroup = new ec2.SecurityGroup(this, 'SharedServiceSecurityGroup', {
      allowAllOutbound: true,
      description: 'Shared security group for caller-managed services',
      vpc,
    });
    const ingressSecurityGroup = new ec2.SecurityGroup(this, 'IngressSecurityGroup', {
      allowAllOutbound: true,
      description: 'Caller-managed ingress source for private services',
      vpc,
    });
    const sharedKey = new kms.Key(this, 'SharedVolumeKey', {
      enableKeyRotation: true,
    });

    const publicApi = new Ec2DockerService(this, 'PublicApi', {
      additionalTags: {
        Team: 'platform',
      },
      dockerImage: 'ec2-go-service:latest',
      identity: {
        displayName: 'Public API',
        namePrefix: 'dev',
      },
      infrastructure: {
        sharedTags: {
          Environment: 'dev',
          ManagedBy: 'CDK',
          Platform: 'platform',
        },
        subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
        vpc,
      },
      serviceName: 'ec2-api',
    });

    const internalTools = new PrivateEc2DockerService(this, 'InternalTools', {
      allowedIngress: [
        {
          description: 'Caller-managed private ingress',
          port: 8080,
          sourceSecurityGroup: ingressSecurityGroup,
        },
      ],
      dockerImage: 'ec2-go-service:latest',
      identity: {
        displayName: 'Internal Tools',
        namePrefix: 'dev',
      },
      infrastructure: {
        kmsKey: sharedKey,
        role: sharedRole,
        securityGroup: sharedSecurityGroup,
        sharedTags: {
          Environment: 'dev',
          ManagedBy: 'CDK',
          Platform: 'platform',
        },
        subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        vpc,
      },
      operations: {
        additionalManagedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        ],
        postBootstrapCommands: ['echo internal-tools-ready'],
      },
      publicPort: 8080,
      serviceName: 'ec2-tools',
    });

    new cdk.CfnOutput(this, 'PublicApiResourcePrefix', {
      value: publicApi.serviceIdentity.resourcePrefix,
    });
    new cdk.CfnOutput(this, 'PublicApiEndpoint', {
      value: publicApi.serviceOutputs.endpoint ?? 'pending',
    });
    new cdk.CfnOutput(this, 'InternalToolsExposure', {
      value: internalTools.serviceOutputs.exposureKind,
    });
  }
}

if (require.main === module) {
  const app = new cdk.App();
  new SharedInfrastructureStack(app, 'SharedInfrastructureStack');
}
