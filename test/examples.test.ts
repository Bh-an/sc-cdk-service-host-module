import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BasicAssignmentStack } from '../examples/basic-stack';
import { ConsumerProofStack } from '../examples/consumer-proof-stack';
import { SharedInfrastructureStack } from '../examples/shared-infra-stack';

test('basic example synthesizes a single service with default local infrastructure', () => {
  const app = new cdk.App();
  const stack = new BasicAssignmentStack(app, 'BasicExampleStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::Instance', 1);
  template.resourceCountIs('AWS::EC2::EIP', 1);
  template.resourceCountIs('AWS::IAM::Role', 1);
  template.resourceCountIs('AWS::KMS::Key', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
});

test('shared infrastructure example synthesizes two services with one caller-managed dependency set', () => {
  const app = new cdk.App();
  const stack = new SharedInfrastructureStack(app, 'SharedInfraExampleStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::Instance', 2);
  template.resourceCountIs('AWS::EC2::EIP', 2);
  template.resourceCountIs('AWS::EC2::NatGateway', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::KMS::Key', 2);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  expect(Object.keys(template.toJSON().Outputs ?? {})).toHaveLength(3);
});

test('consumer proof example synthesizes a public service and an alb-backed private service together', () => {
  const app = new cdk.App();
  const stack = new ConsumerProofStack(app, 'ConsumerProofExampleStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::Instance', 2);
  template.resourceCountIs('AWS::EC2::EIP', 2);
  template.resourceCountIs('AWS::EC2::NatGateway', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::KMS::Key', 2);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    HealthCheckPath: '/health',
    Port: 80,
    Protocol: 'HTTP',
    TargetType: 'instance',
  });
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: Match.arrayWith([
      Match.objectLike({
        Description: 'ALB to private Nginx',
        FromPort: 80,
        SourceSecurityGroupId: Match.anyValue(),
        ToPort: 80,
      }),
    ]),
  });
  expect(Object.keys(template.toJSON().Outputs ?? {})).toHaveLength(3);
});
