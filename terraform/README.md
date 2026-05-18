# Google Cloud Terraform

This creates one Google Compute Engine VM for the project. Docker and Docker Compose are installed by the startup script. Deployment is done by Ansible from `../ansible`.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
terraform output
```

Use a narrow CIDR for `ssh_source_ranges` and `app_source_ranges` before production.

Destroy:

```bash
terraform destroy
```
