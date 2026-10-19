#!/usr/bin/env bash
# aws-deploy.sh — deploy this checkout's HEAD to one EC2 server and print its HTTPS link. Run via `./dc deploy`.
#
# Idempotent: the first run creates the server and what it needs; every later run ships the new code to
# the same server and address. AWS credentials come from the environment or Directory/Secrets/aws.env.
# What it creates (all named "newstepsincoding-…", in AWS_DEFAULT_REGION, default us-east-2):
#   IAM role + instance profile (SSM only) · security group (80/443) · Ubuntu 24.04 t3.small EC2 server ·
#   Elastic IP · private S3 bucket for code bundles. No SSH: commands run through AWS Systems Manager.
# The link is https://<elastic-ip-with-dashes>.sslip.io; Caddy on the server gets its certificate.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] && [ -f Directory/Secrets/aws.env ]; then
  set -a; . Directory/Secrets/aws.env; set +a
fi
export AWS_DEFAULT_REGION="$(printf '%s' "${AWS_DEFAULT_REGION:-us-east-2}" | tr '[:upper:]' '[:lower:]')"
export AWS_PAGER=""

NAME=newstepsincoding
INSTANCE_TYPE="${DEPLOY_INSTANCE_TYPE:-t3.small}"
APP_DIR=/opt/newstepsincoding
TAGS="{Key=Name,Value=$NAME-prod},{Key=Project,Value=$NAME}"
say() { echo "deploy: $*" >&2; }
q() { aws "$@" --output text; }

ACCOUNT="$(q sts get-caller-identity --query Account)"
say "account $ACCOUNT, region $AWS_DEFAULT_REGION"

# --- IAM: the server may talk to Systems Manager, nothing else.
ROLE="$NAME-ec2"
if ! aws iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  say "creating IAM role $ROLE"
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE" \
    --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
fi
if ! aws iam get-instance-profile --instance-profile-name "$ROLE" >/dev/null 2>&1; then
  aws iam create-instance-profile --instance-profile-name "$ROLE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$ROLE" --role-name "$ROLE"
  say "waiting for the new instance profile to propagate"
  sleep 15
fi

# --- Network: the default VPC, web ports open to everyone.
VPC="$(q ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId')"
SG="$(q ec2 describe-security-groups --filters Name=vpc-id,Values="$VPC" Name=group-name,Values="$NAME-web" \
  --query 'SecurityGroups[0].GroupId')"
if [ "$SG" = "None" ]; then
  say "creating security group $NAME-web"
  SG="$(q ec2 create-security-group --vpc-id "$VPC" --group-name "$NAME-web" \
    --description "$NAME web (HTTP/HTTPS)" --query GroupId)"
  for port in 80 443; do
    aws ec2 authorize-security-group-ingress --group-id "$SG" --ip-permissions \
      "IpProtocol=tcp,FromPort=$port,ToPort=$port,IpRanges=[{CidrIp=0.0.0.0/0}],Ipv6Ranges=[{CidrIpv6=::/0}]" >/dev/null
  done
fi

# --- The server.
INSTANCE="$(q ec2 describe-instances \
  --filters Name=tag:Name,Values="$NAME-prod" Name=instance-state-name,Values=pending,running,stopping,stopped \
  --query 'Reservations[0].Instances[0].InstanceId')"
if [ "$INSTANCE" = "None" ]; then
  say "creating $INSTANCE_TYPE server"
  AMI="$(q ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
    --query Parameter.Value)"
  INSTANCE="$(q ec2 run-instances --image-id "$AMI" --instance-type "$INSTANCE_TYPE" \
    --security-group-ids "$SG" --iam-instance-profile Name="$ROLE" \
    --metadata-options HttpTokens=required \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3,Encrypted=true}' \
    --tag-specifications "ResourceType=instance,Tags=[$TAGS]" "ResourceType=volume,Tags=[$TAGS]" \
    --user-data "file://$ROOT/deploy/server-init.sh" \
    --query 'Instances[0].InstanceId')"
fi
STATE="$(q ec2 describe-instances --instance-ids "$INSTANCE" --query 'Reservations[0].Instances[0].State.Name')"
[ "$STATE" = "stopped" ] && aws ec2 start-instances --instance-ids "$INSTANCE" >/dev/null
aws ec2 wait instance-running --instance-ids "$INSTANCE"
say "server $INSTANCE is running"

# --- A fixed public address, so the link survives restarts.
ALLOC="$(q ec2 describe-addresses --filters Name=tag:Name,Values="$NAME-prod" --query 'Addresses[0].AllocationId')"
if [ "$ALLOC" = "None" ]; then
  ALLOC="$(q ec2 allocate-address --domain vpc \
    --tag-specifications "ResourceType=elastic-ip,Tags=[$TAGS]" --query AllocationId)"
fi
aws ec2 associate-address --allocation-id "$ALLOC" --instance-id "$INSTANCE" --allow-reassociation >/dev/null
IP="$(q ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp')"
SITE_HOST="${IP//./-}.sslip.io"

# --- Ship the committed code (HEAD) as a bundle through a private bucket and a short-lived link.
BUCKET="$NAME-deploy-$ACCOUNT-$AWS_DEFAULT_REGION"
if ! aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  if [ "$AWS_DEFAULT_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" \
      --create-bucket-configuration LocationConstraint="$AWS_DEFAULT_REGION" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi
SHA="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain)" ] || say "note: uncommitted changes are NOT deployed (only HEAD $SHA)"
BUNDLE="$(mktemp)"
trap 'rm -f -- "$BUNDLE"' EXIT
git archive --format=tar.gz HEAD >"$BUNDLE"
aws s3 cp --quiet "$BUNDLE" "s3://$BUCKET/$SHA.tar.gz"
URL="$(aws s3 presign "s3://$BUCKET/$SHA.tar.gz" --expires-in 1800)"

say "waiting for the server to report to Systems Manager"
for _ in $(seq 60); do
  ping="$(q ssm describe-instance-information --filters Key=InstanceIds,Values="$INSTANCE" \
    --query 'InstanceInformationList[0].PingStatus')"
  [ "$ping" = "Online" ] && break
  sleep 10
done
[ "$ping" = "Online" ] || { say "server never came online in Systems Manager"; exit 1; }

# On the server: unpack over the old code (keeping the server-only deploy/.env), create the secrets once,
# then rebuild and restart the stack.
REMOTE=$(cat <<SCRIPT
set -eu
cloud-init status --wait >/dev/null || true
mkdir -p $APP_DIR && cd $APP_DIR
curl -fsS '$URL' -o /tmp/bundle.tar.gz
find . -mindepth 1 -maxdepth 1 ! -name deploy -exec rm -rf {} +
find deploy -mindepth 1 ! -name .env -exec rm -rf {} + 2>/dev/null || true
tar -xzf /tmp/bundle.tar.gz && rm -f /tmp/bundle.tar.gz
if [ ! -f deploy/.env ]; then
  umask 077
  printf 'POSTGRES_PASSWORD=%s\nSESSION_SECRET=%s\n' "\$(openssl rand -hex 24)" "\$(openssl rand -hex 32)" > deploy/.env
fi
sed -i '/^SITE_HOST=/d' deploy/.env && echo 'SITE_HOST=$SITE_HOST' >> deploy/.env
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build --wait --remove-orphans
docker image prune -f >/dev/null
echo 'deployed $SHA'
SCRIPT
)
PARAMS="$(python3 -c 'import json,sys; print(json.dumps({"commands": [sys.stdin.read()], "executionTimeout": ["1800"]}))' <<<"$REMOTE")"
CMD="$(q ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
  --comment "deploy $NAME $SHA" --parameters "$PARAMS" --query Command.CommandId)"
say "building and starting the stack on the server (command $CMD; first run takes several minutes)"
while :; do
  status="$(q ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" --query Status 2>/dev/null || echo Pending)"
  case "$status" in Pending | InProgress | Delayed) sleep 15 ;; *) break ;; esac
done
aws ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text | tail -n 20 >&2
[ "$status" = "Success" ] || { say "deploy command ended $status"; exit 1; }

say "waiting for https://$SITE_HOST to answer"
for _ in $(seq 30); do
  curl -fsS "https://$SITE_HOST/api/health" >/dev/null 2>&1 && break
  sleep 10
done
curl -fsS "https://$SITE_HOST/api/health" >/dev/null || { say "https://$SITE_HOST/api/health does not answer"; exit 1; }
echo "Deployed $SHA: https://$SITE_HOST/sky"
