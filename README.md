# MinecraftCDK

Deploy a Vanilla Minecraft server to AWS

THIS IS A WORK IN PROGRESS AND REALLY SHOULDN'T BE USED

## What this does

Setups up a public VPC and ec2 instance, starts up MC server with [mcrcon](https://github.com/Tiiffi/mcrcon).

## TODO

### Need

Stuff needed before an actual release

- Either backup MC World to S3, or use EBS snapshots for MC world so we can persist the world after termination (Eg upgrading the EC2 instance type or size).

### Ideas

- Explore migrating this to be a CDK Construct rather than a stack, so it can be reused in existing stacks
- Support modded (Bukkit, Forge, etc.)
- Support [BungeeCord](https://www.spigotmc.org/wiki/bungeecord/)?
