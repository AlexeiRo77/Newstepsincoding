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
