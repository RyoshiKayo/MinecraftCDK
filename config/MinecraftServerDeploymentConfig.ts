import * as ec2 from '@aws-cdk/aws-ec2';

export interface MinecraftServerDeploymentConfig {
  /** The AWS Region you want to deploy the server to */
  region: string;
  /** The name of the MC Server */
  serverName: string;
  /** Then MC Server owner name. This is for auditing, not used in game */
  owner: string;
  /** Minecraft Server Version */
  serverVersion: '1.16.4';
  /** Minecraft Server Operators */
  ops?: string[];
  /** Secifications for the EC2 instance running the MC server */
  instance?: {
    class: ec2.InstanceClass;
    size: ec2.InstanceSize;
  };
  /** List of IP's that are allowed to connect */
  generalAllowedIps: string[];
  /** List of IP's that are allowed to connect to the mcrcon port */
  rconAllowedIps: string[];
  /** Name of the MC World */
  worldname: string;
}
