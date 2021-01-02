import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class NetworkingStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, `MCVPC-${props.env?.region}`, {
      subnetConfiguration: [
        {
          name: `MCVPC-${props.env?.region}`,
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });
  }
}
