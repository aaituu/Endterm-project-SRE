# Ansible Deploy

1. Create a VM with Terraform.
2. Copy inventory:

```bash
cp ansible/inventory.example.ini ansible/inventory.ini
```

3. Put the VM IP into `ansible/inventory.ini`.
4. Export secrets locally before running:

```bash
export DB_PASSWORD='change-this-database-password'
export JWT_SECRET='change-this-to-a-long-random-secret'
export GRAFANA_ADMIN_PASSWORD='change-this-grafana-password'
```

5. Deploy:

```bash
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

The playbook copies the project, writes `.env` on the server, runs Docker Compose, runs migrations, and checks health endpoints.
