#!/usr/bin/env python3
"""Open (or close) the 4G watch gateway ports on the VitalVue EC2 security group.

    pip install boto3
    python backend/ops/open_watch_ports.py                 # show what would change (no changes)
    python backend/ops/open_watch_ports.py --apply         # add the rules
    python backend/ops/open_watch_ports.py --revoke --apply   # remove them again

The AWS access key and secret are asked for at the prompt (not shown, not saved). Instead,
you can set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or pass --profile NAME.

The key needs: ec2:DescribeInstances, ec2:DescribeSecurityGroups, ec2:DescribeAddresses,
and with --apply: ec2:AuthorizeSecurityGroupIngress (or ec2:RevokeSecurityGroupIngress).

Ports: 7700/tcp (Wonlex watches), 7701/tcp (CLOC BPW8 watches). The source has to be anywhere
(0.0.0.0/0) because watches connect from carrier networks with changing addresses; narrow it
with --cidr if your SIMs use a private APN. The gateway only accepts registered, enabled IMEIs.
"""
import argparse
import getpass
import os
import sys

try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:
    sys.exit("boto3 is needed: pip install boto3")

DEFAULT_IP = "18.142.3.23"
DEFAULT_REGION = "ap-southeast-1"
PORTS = {7700: "VitalVue Wonlex 4G watches", 7701: "VitalVue CLOC BPW8 watches"}


def session_from_args(args) -> "boto3.session.Session":
    if args.profile:
        return boto3.session.Session(profile_name=args.profile, region_name=args.region)
    if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
        return boto3.session.Session(region_name=args.region)
    key = input("AWS access key ID: ").strip()
    secret = getpass.getpass("AWS secret access key (hidden): ").strip()
    if not key or not secret:
        sys.exit("No credentials given.")
    return boto3.session.Session(aws_access_key_id=key, aws_secret_access_key=secret, region_name=args.region)


def find_instance(ec2, ip: str) -> dict:
    res = ec2.describe_instances(Filters=[{"Name": "ip-address", "Values": [ip]}])
    instances = [i for r in res["Reservations"] for i in r["Instances"]]
    if instances:
        return instances[0]
    # Not the primary public IP: look through every instance's network interfaces.
    for page in ec2.get_paginator("describe_instances").paginate():
        for r in page["Reservations"]:
            for i in r["Instances"]:
                ips = {i.get("PublicIpAddress")} | {
                    a.get("Association", {}).get("PublicIp")
                    for n in i.get("NetworkInterfaces", []) for a in n.get("PrivateIpAddresses", [])}
                if ip in ips:
                    return i
    sys.exit(f"No EC2 instance with public IP {ip} in this region. Wrong region? Try --region.")


def has_rule(group: dict, port: int, cidr: str) -> bool:
    for perm in group.get("IpPermissions", []):
        if perm.get("IpProtocol") not in ("tcp", "-1"):
            continue
        if perm.get("IpProtocol") == "tcp" and not (perm.get("FromPort", -1) <= port <= perm.get("ToPort", -1)):
            continue
        if any(r.get("CidrIp") == cidr for r in perm.get("IpRanges", [])):
            return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ip", default=DEFAULT_IP, help=f"the server's public IP (default {DEFAULT_IP})")
    ap.add_argument("--region", default=DEFAULT_REGION, help=f"AWS region (default {DEFAULT_REGION})")
    ap.add_argument("--profile", help="use this AWS CLI profile instead of typing keys")
    ap.add_argument("--sg", help="security group ID to change (default: the instance's first group)")
    ap.add_argument("--cidr", default="0.0.0.0/0", help="allowed source range (default anywhere)")
    ap.add_argument("--revoke", action="store_true", help="remove the rules instead of adding them")
    ap.add_argument("--apply", action="store_true", help="actually make the change (default: only show it)")
    args = ap.parse_args()

    try:
        ec2 = session_from_args(args).client("ec2")
        inst = find_instance(ec2, args.ip)
        name = next((t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"), "(no name)")
        print(f"Instance   {inst['InstanceId']}  {name}  ({inst['State']['Name']})")

        addrs = ec2.describe_addresses(Filters=[{"Name": "public-ip", "Values": [args.ip]}])["Addresses"]
        if addrs:
            print(f"Public IP  {args.ip} is an Elastic IP ({addrs[0].get('AllocationId')}): it won't change.")
        else:
            print(f"Public IP  {args.ip} is NOT an Elastic IP: it changes if the instance is stopped and started.\n"
                  "           Attach an Elastic IP before pointing BPW8 watches at it (they get the IP by SMS).")

        group_ids = [g["GroupId"] for g in inst["SecurityGroups"]]
        groups = ec2.describe_security_groups(GroupIds=group_ids)["SecurityGroups"]
        for g in groups:
            open_ports = [p for p in PORTS if has_rule(g, p, args.cidr)]
            print(f"Group      {g['GroupId']}  {g['GroupName']}  — {args.cidr} already allowed on: "
                  f"{', '.join(map(str, open_ports)) or 'neither 7700 nor 7701'}")
        target_id = args.sg or group_ids[0]
        if target_id not in group_ids:
            sys.exit(f"{target_id} isn't attached to this instance ({', '.join(group_ids)}).")
        target = next(g for g in groups if g["GroupId"] == target_id)

        if args.revoke:
            todo = [p for p in PORTS if has_rule(target, p, args.cidr)]
            verb = "Remove"
        else:
            already = {p for p in PORTS if any(has_rule(g, p, args.cidr) for g in groups)}
            todo = [p for p in PORTS if p not in already]
            verb = "Add"
        if not todo:
            print(f"\nNothing to do: {'none of the rules exist' if args.revoke else 'both ports are already open'}.")
            return 0

        print(f"\n{verb} on {target_id}:")
        for p in todo:
            print(f"  inbound TCP {p} from {args.cidr}  ({PORTS[p]})")
        if not args.apply:
            print("\nNo changes made. Run again with --apply to do it.")
            return 0

        perms = [{"IpProtocol": "tcp", "FromPort": p, "ToPort": p,
                  "IpRanges": [{"CidrIp": args.cidr, **({} if args.revoke else {"Description": PORTS[p]})}]}
                 for p in todo]
        if args.revoke:
            ec2.revoke_security_group_ingress(GroupId=target_id, IpPermissions=perms)
        else:
            ec2.authorize_security_group_ingress(GroupId=target_id, IpPermissions=perms)

        target = ec2.describe_security_groups(GroupIds=[target_id])["SecurityGroups"][0]
        ok = all(has_rule(target, p, args.cidr) != args.revoke for p in todo)
        print(f"\n{'Done' if ok else 'Something is off'}: "
              + ", ".join(f"{p} {'open' if has_rule(target, p, args.cidr) else 'closed'}" for p in PORTS))
        return 0 if ok else 1
    except ClientError as e:
        err = e.response.get("Error", {})
        sys.exit(f"AWS refused: {err.get('Code')}: {err.get('Message')}")
    except BotoCoreError as e:
        sys.exit(f"AWS error: {e}")


if __name__ == "__main__":
    sys.exit(main())
