# Infrastructure

## Directory Structure

```
packages/infra/
├── docker/
│   ├── Dockerfile.api       # API service container
│   └── Dockerfile.web       # Web app container (nginx)
├── k8s/
│   ├── runners.yaml         # GitHub Actions self-hosted runners
│   └── workers.yaml         # BullMQ worker deployment
└── terraform/
    ├── main.tf
    ├── variables.tf
    ├── modules/
    │   ├── networking/
    │   ├── database/
    │   ├── redis/
    │   └── runners/          # Planned — see issue #65
    └── environments/
        ├── staging/
        └── production/
```

## Terraform

### State Management
State is stored in S3 with DynamoDB locking:
- Bucket: `acme-terraform-state`
- Lock table: `acme-terraform-locks`

> **Warning:** If a CI runner times out during `terraform apply`, the state lock may get stuck.
> To force-unlock: `terraform force-unlock <LOCK_ID>`
> See issue #62 for details.

### Deploying
```bash
cd packages/infra/terraform
terraform init
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
```

## Docker

### Building
```bash
# From repo root
docker build -f packages/infra/docker/Dockerfile.api -t acme-api .
```

### Known Issues
- ARM64 builds fail due to `sharp` native compilation. See issue #60.
- Workaround: `docker build --platform linux/amd64 ...` (runs under Rosetta, ~3x slower)

## Workers (Kubernetes)
BullMQ workers run as a separate K8s deployment. See `k8s/workers.yaml`.

Known issues:
- Workers OOM crash under heavy email notification load. See issue #46.
- Memory limit is 512Mi — may need increase for batch operations.
