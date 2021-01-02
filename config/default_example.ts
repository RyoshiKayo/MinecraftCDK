import * as ec2 from '@aws-cdk/aws-ec2';
import { MinecraftServerDeploymentConfig } from './MinecraftServerDeploymentConfig';

const MinecraftServerDeployments: MinecraftServerDeploymentConfig[] = [
  {
    region: 'us-west-2',
    serverName: 'Test',
    owner: 'username',
    serverVersion: '1.16.4',
    instance: {
      class: ec2.InstanceClass.T2,
      size: ec2.InstanceSize.MEDIUM,
    },
    generalAllowedIps: ['your-home-ip'],
    rconAllowedIps: ['your-home-ip'],
    worldname: 'world',
  },
];

const AccountHostedZoneId = 'XXXXXXXXXX';

export default { MinecraftServerDeployments, AccountHostedZoneId };
