import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2DockerService } from '../src';

export class BasicAssignmentStack extends cdk.Stack {
  public constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'ExistingInfraVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.10.0.0/16'),
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    new Ec2DockerService(this, 'PublicApi', {
      additionalTags: {
        Team: 'platform',
      },
      dockerImage: 'bhan/ec2-go-service:latest',
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
  }
}

if (require.main === module) {
  const app = new cdk.App();
  new BasicAssignmentStack(app, 'BasicAssignmentStack');
}
