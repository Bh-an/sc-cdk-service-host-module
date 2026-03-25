import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import {
  PlatformServiceProps,
  buildResourceName,
  resolveServiceIdentity,
} from '../src';

function createProps(): PlatformServiceProps {
  return {
    additionalTags: {
      Team: 'platform',
    },
    identity: {
      displayName: 'Public API',
      namePrefix: 'dev',
    },
    infrastructure: {
      sharedTags: {
        Environment: 'dev',
        ManagedBy: 'CDK',
      },
      subnetSelection: {} as ec2.SubnetSelection,
      vpc: {} as ec2.IVpc,
    },
    serviceName: 'ec2-api',
  };
}

test('resolves additive identity inputs into a canonical shared identity', () => {
  const identity = resolveServiceIdentity(createProps());

  expect(identity).toEqual({
    displayName: 'Public API',
    resourcePrefix: 'dev-ec2-api',
    serviceName: 'ec2-api',
    tags: {
      Environment: 'dev',
      ManagedBy: 'CDK',
      Team: 'platform',
    },
  });
  expect(buildResourceName(identity, 'host')).toBe('dev-ec2-api-host');
});

test('falls back to service name when optional identity metadata is omitted', () => {
  const identity = resolveServiceIdentity({
    infrastructure: {
      subnetSelection: {} as ec2.SubnetSelection,
      vpc: {} as ec2.IVpc,
    },
    serviceName: 'ec2-api',
  });

  expect(identity).toEqual({
    displayName: 'ec2-api',
    resourcePrefix: 'ec2-api',
    serviceName: 'ec2-api',
    tags: {},
  });
});
