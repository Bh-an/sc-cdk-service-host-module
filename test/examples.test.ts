import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BasicAssignmentStack } from '../examples/basic-stack';
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
