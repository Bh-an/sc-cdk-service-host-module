import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_iam as iam, aws_kms as kms } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Ec2DockerService } from '../src';

function createVpc(stack: cdk.Stack, id: string, cidr: string): ec2.Vpc {
  return new ec2.Vpc(stack, id, {
    ipAddresses: ec2.IpAddresses.cidr(cidr),
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
}

test('creates service-local infrastructure and tags when only vpc and subnet selection are provided', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'ServiceStack');
  const vpc = createVpc(stack, 'ExistingVpc', '10.10.0.0/16');

  const service = new Ec2DockerService(stack, 'App', {
    additionalTags: {
      Team: 'platform',
    },
    dockerImage: 'bhan/ec2-go-service:latest',
    identity: {
      displayName: 'Public API',
      namePrefix: 'dev',
    },
    infrastructure: {
      sharedTags: {
        Environment: 'dev',
        ManagedBy: 'CDK',
      },
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
      vpc,
    },
    serviceName: 'ec2-go-service',
  });

  const template = Template.fromStack(stack);
  expect(service.serviceIdentity).toEqual({
    displayName: 'Public API',
    resourcePrefix: 'dev-ec2-go-service',
    serviceName: 'ec2-go-service',
    tags: {
      Environment: 'dev',
      ManagedBy: 'CDK',
      Team: 'platform',
    },
  });
  expect(service.serviceOutputs.displayName).toBe('Public API');
  expect(service.serviceOutputs.hasPublicEndpoint).toBe(true);
  expect(service.serviceOutputs.listenerPort).toBe(80);
  expect(service.serviceOutputs.endpoint).toBeDefined();
  expect(service.serviceOutputs.tags).toEqual({
    Environment: 'dev',
    ManagedBy: 'CDK',
    Team: 'platform',
  });

  template.resourceCountIs('AWS::EC2::Instance', 1);
  template.resourceCountIs('AWS::EC2::EIP', 1);
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);

  template.hasResourceProperties('AWS::EC2::Instance', {
    BlockDeviceMappings: Match.arrayWith([
      Match.objectLike({
        DeviceName: '/dev/xvda',
      }),
      Match.objectLike({
        DeviceName: '/dev/xvdf',
      }),
    ]),
    UserData: Match.anyValue(),
  });

  template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
    LaunchTemplateData: Match.objectLike({
      MetadataOptions: Match.objectLike({
        HttpTokens: 'required',
      }),
    }),
  });

  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'Security group for dev-ec2-go-service',
    SecurityGroupIngress: Match.arrayWith([
      Match.objectLike({
        CidrIp: '0.0.0.0/0',
        FromPort: 80,
        ToPort: 80,
      }),
    ]),
  });

  const renderedTemplate = JSON.stringify(template.toJSON());
  expect(renderedTemplate).toContain('"Key":"Name","Value":"dev-ec2-go-service-host"');
  expect(renderedTemplate).toContain('"Key":"Name","Value":"dev-ec2-go-service-eip"');
  expect(renderedTemplate).toContain('"Key":"Environment","Value":"dev"');
  expect(renderedTemplate).toContain('"Key":"ManagedBy","Value":"CDK"');
  expect(renderedTemplate).toContain('"Key":"Team","Value":"platform"');
  expect(renderedTemplate).toContain('docker pull bhan/ec2-go-service:latest');
  expect(renderedTemplate).toContain('docker rm -f dev-ec2-go-service');
  expect(renderedTemplate).toContain('docker network create');
  expect(renderedTemplate).toContain('curl -sf http://localhost:80/health >/dev/null');
});

test('reuses caller-provided security, role, and kms resources and can disable elastic ip creation', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'SharedInfraStack');
  const vpc = createVpc(stack, 'ExistingVpc', '10.20.0.0/16');

  const sharedSecurityGroup = new ec2.SecurityGroup(stack, 'SharedSecurityGroup', {
    allowAllOutbound: true,
    vpc,
  });
  const sharedRole = new iam.Role(stack, 'SharedRole', {
    assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
  });
  const sharedKey = new kms.Key(stack, 'SharedKey', {
    enableKeyRotation: true,
  });

  const service = new Ec2DockerService(stack, 'App', {
    allowedIngress: [
      {
        cidr: '10.20.0.0/16',
        description: 'In-VPC access',
        port: 8080,
      },
    ],
    dockerImage: 'bhan/ec2-go-service:latest',
    enableElasticIp: false,
    infrastructure: {
      kmsKey: sharedKey,
      role: sharedRole,
      securityGroup: sharedSecurityGroup,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
      vpc,
    },
    publicPort: 8080,
    serviceName: 'ec2-go-service',
  });

  const template = Template.fromStack(stack);
  expect(service.serviceOutputs.hasPublicEndpoint).toBe(false);
  expect(service.serviceOutputs.endpoint).toBeUndefined();
  expect(service.serviceOutputs.listenerPort).toBe(8080);
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  template.resourceCountIs('AWS::EC2::Instance', 1);
  template.resourceCountIs('AWS::EC2::EIP', 0);

  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: Match.arrayWith([
      Match.objectLike({
        CidrIp: '10.20.0.0/16',
        Description: 'In-VPC access',
        FromPort: 8080,
        ToPort: 8080,
      }),
    ]),
  });
});

test('supports multiple services in the same vpc without resource collisions', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'MultiServiceStack');
  const vpc = createVpc(stack, 'ExistingVpc', '10.30.0.0/16');

  const api = new Ec2DockerService(stack, 'Api', {
    dockerImage: 'bhan/ec2-go-service:latest',
    identity: {
      namePrefix: 'dev',
    },
    infrastructure: {
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
      vpc,
    },
    serviceName: 'ec2-api',
  });

  const worker = new Ec2DockerService(stack, 'Worker', {
    dockerImage: 'bhan/ec2-worker:latest',
    enableElasticIp: false,
    identity: {
      namePrefix: 'dev',
    },
    infrastructure: {
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
      vpc,
    },
    publicPort: 8080,
    serviceName: 'ec2-worker',
  });

  const template = Template.fromStack(stack);
  expect(api.serviceIdentity.resourcePrefix).toBe('dev-ec2-api');
  expect(worker.serviceIdentity.resourcePrefix).toBe('dev-ec2-worker');
  expect(api.serviceOutputs.hasPublicEndpoint).toBe(true);
  expect(worker.serviceOutputs.hasPublicEndpoint).toBe(false);
  template.resourceCountIs('AWS::EC2::Instance', 2);
  template.resourceCountIs('AWS::EC2::EIP', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.hasResourceProperties('AWS::EC2::Instance', {
    Tags: Match.arrayWith([
      Match.objectLike({
        Key: 'Name',
        Value: 'dev-ec2-api-host',
      }),
    ]),
  });
  template.hasResourceProperties('AWS::EC2::Instance', {
    Tags: Match.arrayWith([
      Match.objectLike({
        Key: 'Name',
        Value: 'dev-ec2-worker-host',
      }),
    ]),
  });
});
