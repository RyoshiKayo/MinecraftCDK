#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { MinecraftDeployment } from './minecraftDeploymentStack';
import config = require('config');
import { MinecraftServerDeploymentConfig } from '../config/MinecraftServerDeploymentConfig';
import { NetworkingStack } from './networkingStack';

const app = new cdk.App();

const deployments =
  config.get<MinecraftServerDeploymentConfig[]>('MinecraftServerDeployments') || new Error('No deployments found');

const vpcForRegion: Map<string, NetworkingStack> = new Map([]);

//organize
deployments.forEach((deploymentConfig) => {
  if (!vpcForRegion.has(deploymentConfig.region)) {
    vpcForRegion.set(
      deploymentConfig.region,
      new NetworkingStack(app, `MCNet-${deploymentConfig.region}`, {
        env: { region: deploymentConfig.region },
      }),
    );
  }

  const vpcStackForRegion =
    vpcForRegion.get(deploymentConfig.region) ||
    new NetworkingStack(app, `MCNet-${deploymentConfig.region}`, {
      env: { region: deploymentConfig.region },
    });

  const miencraftDeployment = new MinecraftDeployment(
    app,
    `MC-${deploymentConfig.serverName}-${(deploymentConfig.serverVersion as string).replace(/\./gm, '-')}`,
    {
      deploymentConfig,
      vpc: vpcStackForRegion?.vpc,
      env: { region: deploymentConfig.region },
      accountHostedZoneId: config.get<string>('AccountHostedZoneId'),
      serverName: deploymentConfig.serverName,
      allowedIpsForRcon: deploymentConfig.rconAllowedIps,
      worldname: deploymentConfig.worldname,
    },
  );

  miencraftDeployment.addDependency(vpcStackForRegion);
});
