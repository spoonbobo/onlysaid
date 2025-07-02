helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm lint .\onlysaid
helm template onlysaid-test .\onlysaid --values .\onlysaid\values-local.yaml --dry-run

helm install onlysaid-local .\onlysaid --values .\onlysaid\values-local.yaml