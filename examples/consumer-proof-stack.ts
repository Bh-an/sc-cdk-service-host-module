import * as cdk from 'aws-cdk-lib';
import {
  aws_ec2 as ec2,
  aws_elasticloadbalancingv2 as elbv2,
  aws_elasticloadbalancingv2_targets as elbv2Targets,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Ec2DockerService,
  PrivateEc2DockerService,
} from '../src';

export class ConsumerProofStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'ConsumerVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.40.0.0/16'),
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

    const publicApi = new Ec2DockerService(this, 'PublicApi', {
      additionalTags: {
        Consumer: 'proof',
      },
      dockerImage: 'bhan/ec2-go-service:latest',
      identity: {
        displayName: 'Public API',
        namePrefix: 'proof',
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
      serviceName: 'ec2-public-api',
    });

    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      allowAllOutbound: true,
      description: 'Security group for the consumer ALB',
      vpc,
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Public HTTP access',
    );

    const privateApi = new PrivateEc2DockerService(this, 'PrivateApi', {
      allowedIngress: [
        {
          description: 'ALB to private Nginx',
          port: 80,
          sourceSecurityGroup: albSecurityGroup,
        },
      ],
      dockerImage: 'bhan/ec2-go-service:latest',
      identity: {
        displayName: 'Private API',
        namePrefix: 'proof',
      },
      infrastructure: {
        sharedTags: {
          Environment: 'dev',
          ManagedBy: 'CDK',
          Platform: 'platform',
        },
        subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        vpc,
      },
      serviceName: 'ec2-private-api',
    });

    const privateAlb = new elbv2.ApplicationLoadBalancer(this, 'PrivateApiAlb', {
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const listener = privateAlb.addListener('HttpListener', {
      open: false,
      port: 80,
    });

    listener.addTargets('PrivateApiTargets', {
      healthCheck: {
        path: '/health',
        port: '80',
      },
      port: 80,
      targets: [
        new elbv2Targets.InstanceTarget(privateApi.instance, 80),
      ],
    });

    new cdk.CfnOutput(this, 'PublicApiEndpoint', {
      value: publicApi.serviceOutputs.endpoint ?? 'pending',
    });
    new cdk.CfnOutput(this, 'PrivateAlbDnsName', {
      value: privateAlb.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'PrivateServiceExposure', {
      value: privateApi.serviceOutputs.exposureKind,
    });
  }
}

if (require.main === module) {
  const app = new cdk.App();
  new ConsumerProofStack(app, 'ConsumerProofStack');
}
