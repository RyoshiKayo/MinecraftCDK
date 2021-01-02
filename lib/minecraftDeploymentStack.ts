import * as cdk from '@aws-cdk/core';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { ARecord, SrvRecord, HostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { MinecraftServerDeploymentConfig } from '../config/MinecraftServerDeploymentConfig';
import MinecraftServerDownloadLocations from '../definitions/MinecraftServerDownloadLocations';
import { App, CfnOutput, Duration } from '@aws-cdk/core';
import {
  AmazonLinuxCpuType,
  AmazonLinuxGeneration,
  BlockDeviceVolume,
  CloudFormationInit,
  EbsDeviceVolumeType,
  InitCommand,
  InitFile,
  InitPackage,
  InitSource,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from '@aws-cdk/aws-ec2';

const HOME_DIR = '/home/ec2-user';
const MC_DOMAIN_BASE = 'aws.everything.moe';

export interface MinecraftDeploymentProps extends cdk.StackProps {
  deploymentConfig: MinecraftServerDeploymentConfig;
  vpc: Vpc;
  accountHostedZoneId: string;
  serverName: string;
  allowedIpsForRcon: string[];
  worldname: string;
}

export class MinecraftDeployment extends cdk.Stack {
  readonly securityGroup: SecurityGroup;

  constructor(scope: App, id: string, props: MinecraftDeploymentProps) {
    super(scope, id, props);
    // const availabilityZone = `${props.deploymentConfig.region}`;

    this.tags.setTag('ServerName', props.deploymentConfig.serverName);
    this.tags.setTag('ServerOwner', props.deploymentConfig.owner);
    this.tags.setTag('ServerRegion', props.deploymentConfig.region);
    this.tags.setTag('ServerVersion', props.deploymentConfig.serverVersion);
    this.tags.setTag('ServerOps', props.deploymentConfig.ops ? 'true' : 'false');

    const ec2SsmRole = new Role(this, 'EC2SSMRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      inlinePolicies: {
        SSM: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ssm:UpdateInstanceInformation',
                'ssmmessages:CreateControlChannel',
                'ssmmessages:CreateDataChannel',
                'ssmmessages:OpenControlChannel',
                'ssmmessages:OpenDataChannel',
              ],
              resources: ['*'],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetEncryptionConfiguration'],
              resources: ['*'],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['kms:Decrypt'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const serverJarLoc = `${HOME_DIR}/server.jar`;

    const ec2Instance = new Instance(
      this,
      `MC-${props.deploymentConfig.serverName}-${props.deploymentConfig.serverVersion}`,
      {
        // availabilityZone,
        blockDevices: [
          {
            deviceName: '/dev/xvdw',
            volume: BlockDeviceVolume.ebs(10, {
              deleteOnTermination: false,
              volumeType: EbsDeviceVolumeType.GP2,
            }),
            mappingEnabled: true,
          },
        ],
        instanceName: `MC-${props.deploymentConfig.serverName}-${props.deploymentConfig.serverVersion}`,
        instanceType: InstanceType.of(
          props.deploymentConfig.instance?.class || InstanceClass.T2,
          props.deploymentConfig.instance?.size || InstanceSize.MEDIUM,
        ),
        machineImage: MachineImage.latestAmazonLinux({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: AmazonLinuxCpuType.X86_64,
        }),
        vpc: props.vpc,
        allowAllOutbound: true,
        init: CloudFormationInit.fromElements(
          InitFile.fromUrl(serverJarLoc, MinecraftServerDownloadLocations[props.deploymentConfig.serverVersion], {
            mode: '000644',
            owner: 'ec2-user',
            group: 'ec2-user',
          }),
          InitFile.fromAsset(`/etc/systemd/system/minecraft-server.service`, `resources/minecraft-server.service`, {
            mode: '000777',
            owner: 'root',
            group: 'root',
          }),
          InitFile.fromAsset(`${HOME_DIR}/server.properties`, `resources/server.properties.default`, {
            mode: '000644',
            owner: 'ec2-user',
            group: 'ec2-user',
          }),
          InitFile.fromAsset(`${HOME_DIR}/eula.txt`, `resources/eula.txt`, {
            mode: '000644',
            owner: 'ec2-user',
            group: 'ec2-user',
          }),
          InitSource.fromGitHub(`${HOME_DIR}/mcrcon`, 'Tiiffi', 'mcrcon'),
          InitFile.fromAsset(`${HOME_DIR}/setup.sh`, `resources/setup.sh`, {
            mode: '000755',
          }),
          InitFile.fromAsset(`${HOME_DIR}/start.sh`, `resources/start.sh`, {
            mode: '000755',
            owner: 'ec2-user',
            group: 'ec2-user',
          }),
          InitFile.fromAsset(`${HOME_DIR}/stop.sh`, `resources/stop.sh`, {
            mode: '000755',
            owner: 'ec2-user',
            group: 'ec2-user',
          }),
          InitPackage.yum('java-11-amazon-corretto'),
          InitPackage.yum('git'),
          InitPackage.yum('gcc'),
          InitCommand.argvCommand([`${HOME_DIR}/setup.sh`]),
        ),
        role: ec2SsmRole,
        vpcSubnets: {
          subnetType: SubnetType.PUBLIC,
        },
      },
    );

    this.securityGroup = new SecurityGroup(this, `MCNetSG-${props.env?.region}`, {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // Do I need this? Lets see
    // this.securityGroup.addIngressRule(
    //   ec2.Peer.anyIpv4(),
    //   ec2.Port.udp(25565),
    //   "Minecraft-UDP"
    // );

    if (props.deploymentConfig.generalAllowedIps.length >= 1) {
      props.deploymentConfig.generalAllowedIps.forEach((ipaddr) => {
        this.securityGroup.addIngressRule(Peer.ipv4(`${ipaddr}/32`), Port.tcp(25565), 'Minecraft user');
      });
    } else {
      this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(25565), 'Minecraft TCP');
    }

    if (props.deploymentConfig.rconAllowedIps && props.deploymentConfig.rconAllowedIps.length >= 1) {
      props.deploymentConfig.rconAllowedIps.forEach((ipaddr) => {
        this.securityGroup.addIngressRule(Peer.ipv4(`${ipaddr}/32`), Port.tcp(25575), 'Minecraft RCON');
      });
    }

    ec2Instance.addSecurityGroup(this.securityGroup);

    const accountHostedZone = HostedZone.fromHostedZoneAttributes(this, 'AccHZ', {
      hostedZoneId: props.accountHostedZoneId,
      zoneName: MC_DOMAIN_BASE,
    });

    new CfnOutput(this, 'EC2InstaceIP', {
      value: ec2Instance.instancePublicIp,
      description: 'Minecraft Server IP',
      exportName: 'Minecraft-Server-IP',
    });

    new ARecord(this, `MCDomainAlias`, {
      zone: accountHostedZone,
      target: RecordTarget.fromIpAddresses(ec2Instance.instancePublicIp),
      ttl: Duration.minutes(5),
      recordName: `${props.serverName.toLowerCase()}.${MC_DOMAIN_BASE}`,
    });

    new SrvRecord(this, `MCDomain`, {
      zone: accountHostedZone,
      ttl: Duration.minutes(5),
      recordName: `_minecraft._tcp.${props.serverName.toLowerCase()}.${MC_DOMAIN_BASE}`,
      values: [
        {
          priority: 0,
          weight: 0,
          port: 25565,
          hostName: `${props.serverName.toLowerCase()}.${MC_DOMAIN_BASE}`,
        },
      ],
    });
  }
}
