# Directory/Secrets

Local, git-ignored home for credentials that must not reach the repository. Only this README, the
`.gitignore` and `*.example` templates are tracked; every other file in this folder stays on disk.

## AWS account (deployment)

The AWS access key pair used to deploy the app.

1. Copy the template: `cp Directory/Secrets/aws.env.example Directory/Secrets/aws.env`
2. Fill in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_DEFAULT_REGION` in `aws.env`.
3. Confirm git ignores it: `git check-ignore Directory/Secrets/aws.env` prints the path.

Load it into a shell for the AWS CLI with `set -a; . Directory/Secrets/aws.env; set +a`.
Use an IAM user scoped to deployment only, and rotate the key if the file is ever exposed.

## SSH key pair (EC2 deployment)

The OpenSSH key pair used to log in to the EC2 host the app deploys to. Generate it on your own
machine so the private key never leaves it, and protect it with a passphrase.

1. Generate an ed25519 pair (`ssh-keygen` prompts for the passphrase):
   `ssh-keygen -t ed25519 -a 100 -C "newstepsincoding-ec2-deploy" -f Directory/Secrets/ec2-deploy`
2. Confirm git ignores both files: `git check-ignore Directory/Secrets/ec2-deploy Directory/Secrets/ec2-deploy.pub`
   prints both paths.
3. Register the public half only: import `ec2-deploy.pub` as an EC2 key pair
   (`aws ec2 import-key-pair --key-name newstepsincoding-deploy --public-key-material fileb://Directory/Secrets/ec2-deploy.pub`),
   or append it to `~/.ssh/authorized_keys` on an existing instance.

Connect with `ssh -i Directory/Secrets/ec2-deploy <user>@<host>` (`ec2-user` on Amazon Linux,
`ubuntu` on Ubuntu). Never share or copy the private file `ec2-deploy`; if it is ever exposed,
delete the key pair in EC2, remove it from `authorized_keys` and generate a new one.
